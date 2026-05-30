const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = 'super_secret_key_aligator';
const dbPath = path.resolve(__dirname, '../database.sqlite');
let db;

describe('Фаза 6: Наскрізне тестування та Адмін-панель', () => {
    let adminToken = jwt.sign({ userId: 1, rol: 'адмін' }, JWT_SECRET);
    let clientToken;
    let testClientId;
    let testSlotId;
    let bookingId;

    beforeAll(async () => {
        return new Promise((resolve, reject) => {
            db = new sqlite3.Database(dbPath, async (err) => {
                if (err) return reject(err);
                
                const runQuery = (sql, params = []) => new Promise((res, rej) => {
                    db.run(sql, params, function(e) { if (e) rej(e); else res(this.lastID); });
                });

                try {
                    // Очищення від попередніх запусків
                    await runQuery("DELETE FROM users WHERE email = 'e2e@test.ua'");

                    // Створення клієнта (імітація реєстрації)
                    testClientId = await runQuery(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol, data_reyestr) 
                                                   VALUES ('Тестов', 'Іван', 'e2e@test.ua', '0990000000', '1', 'клієнт', datetime('now'))`);
                    clientToken = jwt.sign({ userId: testClientId, rol: 'клієнт' }, JWT_SECRET);

                    // Підготовка розкладу на поточну дату для перевірки дашборду
                    const catId = await runQuery("INSERT INTO categories (nazva) VALUES ('E2E')");
                    const srvId = await runQuery("INSERT INTO services (category_id, nazva, tryvalist_hv, cina) VALUES (?, 'E2E Послуга', 60, 500)", [catId]);
                    const today = new Date().toISOString().split('T')[0];
                    testSlotId = await runQuery("INSERT INTO slots (service_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '15:00', '16:00', 5, 'відкритий')", [srvId, today]);

                    resolve();
                } catch (e) { reject(e); }
            });
        });
    });

    afterAll((done) => {
        db.run("DELETE FROM users WHERE email = 'e2e@test.ua'", () => db.close(done));
    });

    test('1. Адмін: перегляд списку клієнтів', async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty('email');
    });

    test('2. Адмін: пошук клієнта (введення "Іван")', async () => {
        const res = await request(app).get('/api/users?search=іван').set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        
        // Перевіряємо, чи повернутий користувач має ім'я "Іван" (або містить його в email)
        const hasIvan = res.body.some(u => u.imya === 'Іван' || u.email.includes('іван'));
        expect(hasIvan).toBe(true);
    });

    test('3. Клієнт: редагування профілю (зміна телефону)', async () => {
        const res = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ prizvyshche: 'Тестов', imya: 'Іван', telefon: '0671234567' });
        
        expect(res.statusCode).toBe(200);

        // Перевіряємо, чи оновились дані в базі
        const check = await request(app).get('/api/users?search=e2e@test.ua').set('Authorization', `Bearer ${adminToken}`);
        expect(check.body[0].telefon).toBe('0671234567');
    });

    test('5. Наскрізний тест (Створення запису -> Підтвердження Адміном -> Скасування Клієнтом)', async () => {
        // Етап А: Клієнт створює запис
        const bookRes = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ slot_id: testSlotId });
        expect(bookRes.statusCode).toBe(201);
        bookingId = bookRes.body.bookingId;

        // Етап Б: Адмін підтверджує запис
        const confRes = await request(app)
            .put(`/api/bookings/${bookingId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'Підтверджено' });
        expect(confRes.statusCode).toBe(200);

        // Етап В: Клієнт скасовує запис
        const cancRes = await request(app)
            .put(`/api/bookings/${bookingId}/status`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'Скасовано' });
        expect(cancRes.statusCode).toBe(200);
    });

    test('4. Адмін: статистика за поточну дату та тиждень (Дашборд)', async () => {
        const res = await request(app).get('/api/stats/dashboard').set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('bookings_today');
        expect(res.body).toHaveProperty('new_clients_week');
        // Оскільки ми щойно створили тестового клієнта, лічильник нових має бути >= 1
        expect(res.body.new_clients_week).toBeGreaterThanOrEqual(1); 
    });
});