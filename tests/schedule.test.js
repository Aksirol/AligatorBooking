const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = 'super_secret_key_aligator';
const dbPath = path.resolve(__dirname, '../database.sqlite');
let db;

describe('Фаза 4: Управління розкладом (Повний тест-план)', () => {
    let adminToken = jwt.sign({ userId: 1, rol: 'адмін' }, JWT_SECRET);
    
    // Ідентифікатори для тестів
    let testUserId;
    let massageServiceId;
    let yogaServiceId;
    let specPetrenkoId;
    
    let slotSingleId;
    let slotGroupId;
    let slotToDelete;
    let slotBusyId;
    let slotMathId;

    beforeAll(async () => {
        return new Promise((resolve, reject) => {
            db = new sqlite3.Database(dbPath, async (err) => {
                if (err) return reject(err);
                
                // Допоміжна функція для гарантованого послідовного запису
                const runQuery = (sql, params = []) => new Promise((res, rej) => {
                    db.run(sql, params, function(error) {
                        if (error) rej(error);
                        else res(this.lastID);
                    });
                });

                try {
                    // Створення тестового клієнта
                    testUserId = await runQuery("INSERT INTO users (prizvyshche, imya, email, parol_hash, rol) VALUES ('Клієнт', 'Тест', 'client_tc_schedule@mail.com', 'hash', 'клієнт')");

                    // Створення категорій та послуг
                    const catSpa = await runQuery("INSERT INTO categories (nazva) VALUES ('SPA')");
                    massageServiceId = await runQuery("INSERT INTO services (category_id, nazva, tryvalist_hv, cina) VALUES (?, 'SPA-масаж', 60, 500)", [catSpa]);
                    
                    const catFit = await runQuery("INSERT INTO categories (nazva) VALUES ('Фітнес')");
                    yogaServiceId = await runQuery("INSERT INTO services (category_id, nazva, tryvalist_hv, cina) VALUES (?, 'Йога', 90, 300)", [catFit]);

                    // Створення спеціаліста
                    specPetrenkoId = await runQuery("INSERT INTO specialists (prizvyshche, imya) VALUES ('Петренко', 'Іван')");
                    
                    // --- Підготовка слотів для ТК 8, 9, 10 ---
                    
                    // Слот ТК 8: 1 місце, 1 запис (повністю зайнятий)
                    slotBusyId = await runQuery("INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '2026-06-20', '12:00', '13:00', 1, 'відкритий')", [massageServiceId, specPetrenkoId]);
                    await runQuery("INSERT INTO bookings (client_id, slot_id, status) VALUES (?, ?, 'підтверджено')", [testUserId, slotBusyId]);

                    // Слот ТК 9: 5 місць, 3 записи (2 вільних)
                    slotMathId = await runQuery("INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '2026-06-21', '14:00', '15:00', 5, 'відкритий')", [yogaServiceId, specPetrenkoId]);
                    await runQuery("INSERT INTO bookings (client_id, slot_id, status) VALUES (?, ?, 'підтверджено')", [testUserId, slotMathId]);
                    await runQuery("INSERT INTO bookings (client_id, slot_id, status) VALUES (?, ?, 'підтверджено')", [testUserId, slotMathId]);
                    await runQuery("INSERT INTO bookings (client_id, slot_id, status) VALUES (?, ?, 'підтверджено')", [testUserId, slotMathId]);
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    afterAll((done) => {
        // Очищаємо тестового клієнта, щоб не було конфліктів UNIQUE email
        db.run("DELETE FROM users WHERE email = 'client_tc_schedule@mail.com'", () => {
            db.close(done);
        });
    });

    // --- Виконання тест-кейсів ---

    test('1. Адмін: створення одиночного слоту (Масаж, 1 місце)', async () => {
        const res = await request(app).post('/api/schedule').set('Authorization', `Bearer ${adminToken}`).send({
            service_id: massageServiceId, specialist_id: specPetrenkoId,
            data: '2025-07-10', chas_poch: '10:00', chas_kin: '11:00', maks_misc: 1, status: 'Активний'
        });
        expect(res.statusCode).toBe(201);
        slotSingleId = res.body.id;
    });

    test('2. Адмін: створення слоту для групового заняття (Йога, 10 місць)', async () => {
        const res = await request(app).post('/api/schedule').set('Authorization', `Bearer ${adminToken}`).send({
            service_id: yogaServiceId, specialist_id: specPetrenkoId,
            data: '2025-07-10', chas_poch: '18:00', chas_kin: '19:30', maks_misc: 10, status: 'Активний'
        });
        expect(res.statusCode).toBe(201);
        slotGroupId = res.body.id;
    });

    test('3. Адмін: редагування часу слоту (з 10:00 на 11:00)', async () => {
        const res = await request(app).put(`/api/schedule/${slotSingleId}`).set('Authorization', `Bearer ${adminToken}`).send({
            data: '2025-07-10', chas_poch: '11:00', chas_kin: '12:00', maks_misc: 1, status: 'Активний'
        });
        expect(res.statusCode).toBe(200);
        
        const check = await request(app).get(`/api/schedule`);
        const updatedSlot = check.body.find(s => s.id === slotSingleId);
        expect(updatedSlot.chas_poch).toBe('11:00');
    });

    test('4. Адмін: блокування слоту', async () => {
        const res = await request(app).put(`/api/schedule/${slotSingleId}`).set('Authorization', `Bearer ${adminToken}`).send({
            data: '2025-07-10', chas_poch: '11:00', chas_kin: '12:00', maks_misc: 1, status: 'Заблокований'
        });
        expect(res.statusCode).toBe(200);
        
        const check = await request(app).get(`/api/schedule`);
        const blockedSlot = check.body.find(s => s.id === slotSingleId);
        expect(blockedSlot.status).toBe('Заблокований');
    });

    test('5. Адмін: видалення порожнього слоту', async () => {
        const createRes = await request(app).post('/api/schedule').set('Authorization', `Bearer ${adminToken}`).send({
            service_id: massageServiceId, specialist_id: specPetrenkoId, data: '2026-01-01', chas_poch: '09:00', chas_kin: '10:00', maks_misc: 1
        });
        slotToDelete = createRes.body.id;

        const delRes = await request(app).delete(`/api/schedule/${slotToDelete}`).set('Authorization', `Bearer ${adminToken}`);
        expect(delRes.statusCode).toBe(200);
        expect(delRes.body.message).toBe('Слот видалено');
    });

    test('6. Клієнт: перегляд розкладу (наявність усіх полів)', async () => {
        const res = await request(app).get('/api/schedule');
        expect(res.statusCode).toBe(200);
        const slot = res.body.find(s => s.id === slotGroupId);
        
        expect(slot).toHaveProperty('data');
        expect(slot).toHaveProperty('chas_poch');
        expect(slot).toHaveProperty('service_name');
        expect(slot).toHaveProperty('spec_prizvyshche');
        expect(slot).toHaveProperty('vilni_miscya');
    });

    test('7. Клієнт: фільтрація розкладу за послугою', async () => {
        const res = await request(app).get(`/api/schedule?serviceId=${massageServiceId}`);
        expect(res.statusCode).toBe(200);
        
        res.body.forEach(slot => {
            expect(slot.service_name).toBe('SPA-масаж');
        });
    });

    test('8. Відображення зайнятого слоту (вільних місць = 0)', async () => {
        const res = await request(app).get('/api/schedule');
        const busySlot = res.body.find(s => s.id === slotBusyId);
        
        expect(busySlot).toBeDefined();
        expect(busySlot.vilni_miscya).toBe(0);
    });

    test('9. Відображення кількості вільних місць (Математика: 5 - 3 = 2)', async () => {
        const res = await request(app).get('/api/schedule');
        const mathSlot = res.body.find(s => s.id === slotMathId);
        
        expect(mathSlot).toBeDefined();
        expect(mathSlot.vilni_miscya).toBe(2);
    });

    test('10. Захист від видалення слоту з активними записами', async () => {
        const res = await request(app).delete(`/api/schedule/${slotBusyId}`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Неможливо видалити слот, на який вже існують записи');
    });
});