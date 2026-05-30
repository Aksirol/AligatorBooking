const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = 'super_secret_key_aligator';
const dbPath = path.resolve(__dirname, '../database.sqlite');
let db;

describe('Фаза 5: Модуль онлайн-запису (Затверджений тест-план)', () => {
    let adminToken = jwt.sign({ userId: 1, rol: 'адмін' }, JWT_SECRET);
    let client1Token;
    let client2Token;
    
    let slotCapacity5Id; // Слот з місткістю 5 (для ТК 1, 2, 3, 4, 6, 7)
    let slotCapacity1Id; // Слот з місткістю 1 (для ТК 5)
    
    let myBookingId;
    let adminBookingId;

    beforeAll(async () => {
        return new Promise((resolve, reject) => {
            db = new sqlite3.Database(dbPath, async (err) => {
                if (err) return reject(err);

                const runQuery = (sql, params = []) => new Promise((res, rej) => {
                    db.run(sql, params, function(e) { if (e) rej(e); else res(this.lastID); });
                });

                try {
                    // 1. Створюємо двох клієнтів
                    const c1Id = await runQuery("INSERT INTO users (prizvyshche, imya, email, parol_hash, rol) VALUES ('Клієнт1', 'Тест', 'b1@test.ua', '1', 'клієнт')");
                    const c2Id = await runQuery("INSERT INTO users (prizvyshche, imya, email, parol_hash, rol) VALUES ('Клієнт2', 'Тест', 'b2@test.ua', '1', 'клієнт')");
                    client1Token = jwt.sign({ userId: c1Id, rol: 'клієнт' }, JWT_SECRET);
                    client2Token = jwt.sign({ userId: c2Id, rol: 'клієнт' }, JWT_SECRET);

                    // 2. Створюємо сутності для каталогу
                    const catId = await runQuery("INSERT INTO categories (nazva) VALUES ('Масажі')");
                    const srvId = await runQuery("INSERT INTO services (category_id, nazva, tryvalist_hv, cina) VALUES (?, 'Масаж', 60, 500)", [catId]);
                    const specId = await runQuery("INSERT INTO specialists (prizvyshche, imya) VALUES ('Петренко', 'Олег')");

                    // 3. Створюємо слоти
                    slotCapacity5Id = await runQuery("INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '2026-08-01', '10:00', '11:00', 5, 'відкритий')", [srvId, specId]);
                    slotCapacity1Id = await runQuery("INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '2026-08-01', '12:00', '13:00', 1, 'відкритий')", [srvId, specId]);

                    resolve();
                } catch (e) { reject(e); }
            });
        });
    });

    afterAll((done) => {
        db.run("DELETE FROM users WHERE email IN ('b1@test.ua', 'b2@test.ua')", () => {
            db.close(done);
        });
    });

    test('1. Клієнт: вибір слоту і перехід до підтвердження', async () => {
        // Імітуємо отримання даних слоту клієнтом перед записом
        const res = await request(app).get('/api/schedule');
        const slot = res.body.find(s => s.id === slotCapacity5Id);
        
        expect(res.statusCode).toBe(200);
        expect(slot.service_name).toBe('Масаж');
        expect(slot.data).toBe('2026-08-01');
        expect(slot.spec_prizvyshche).toBe('Петренко');
        expect(slot.vilni_miscya).toBe(5); // Поки що 5
    });

    test('2. Клієнт: підтвердження запису', async () => {
        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${client1Token}`)
            .send({ slot_id: slotCapacity5Id });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Запис збережено');
        expect(res.body.status).toBe('Очікує підтвердження');
        
        myBookingId = res.body.bookingId;
    });

    test('3. Запис відображається у "Мої записи"', async () => {
        const res = await request(app)
            .get('/api/bookings/my')
            .set('Authorization', `Bearer ${client1Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        
        const booking = res.body[0];
        expect(booking).toHaveProperty('data');
        expect(booking).toHaveProperty('service_name', 'Масаж');
        expect(booking).toHaveProperty('spec_prizvyshche', 'Петренко');
        expect(booking).toHaveProperty('booking_status', 'Очікує підтвердження');
    });

    test('4. Зменшення кількості вільних місць (з 5 на 4)', async () => {
        const res = await request(app).get('/api/schedule');
        const slot = res.body.find(s => s.id === slotCapacity5Id);
        
        expect(slot.vilni_miscya).toBe(4); // Оновлення негайне
    });

    test('5. Запис на вже зайнятий слот', async () => {
        // Спочатку Клієнт 1 займає єдине місце в слоті з місткістю 1
        await request(app).post('/api/bookings').set('Authorization', `Bearer ${client1Token}`).send({ slot_id: slotCapacity1Id });
        
        // Тепер Клієнт 2 намагається записатись туди ж
        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${client2Token}`)
            .send({ slot_id: slotCapacity1Id });
        
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('На жаль, вільних місць немає');
    });

    test('6. Подвійний запис на той самий слот', async () => {
        // Клієнт 1 вже має запис на slotCapacity5Id (зроблено в Тесті 2), пробує ще раз
        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${client1Token}`)
            .send({ slot_id: slotCapacity5Id });
        
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Ви вже записані на цей сеанс');
    });

    test('7. Клієнт: скасування власного запису', async () => {
        // Клієнт скасовує запис
        const res = await request(app)
            .put(`/api/bookings/${myBookingId}/status`)
            .set('Authorization', `Bearer ${client1Token}`)
            .send({ status: 'Скасовано' });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('Скасовано');

        // Перевіряємо, що вільні місця повернулись до 5
        const scheduleRes = await request(app).get('/api/schedule');
        const slot = scheduleRes.body.find(s => s.id === slotCapacity5Id);
        expect(slot.vilni_miscya).toBe(5);
    });

    test('8. Адмін: підтвердження запису', async () => {
        // Оскільки попередній запис скасовано, створимо новий запис від Клієнта 2 для адміна
        const bookRes = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${client2Token}`)
            .send({ slot_id: slotCapacity5Id });
        adminBookingId = bookRes.body.bookingId;

        // Адмін підтверджує його
        const res = await request(app)
            .put(`/api/bookings/${adminBookingId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'Підтверджено' });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('Підтверджено');

        // Перевірка видимості в кабінеті клієнта
        const clientRes = await request(app).get('/api/bookings/my').set('Authorization', `Bearer ${client2Token}`);
        const confirmedBooking = clientRes.body.find(b => b.booking_id === adminBookingId);
        expect(confirmedBooking.booking_status).toBe('Підтверджено');
    });
});