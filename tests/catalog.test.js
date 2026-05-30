const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = 'super_secret_key_aligator';
const dbPath = path.resolve(__dirname, '../database.sqlite');
let db;

describe('Фаза 3: Детальний тест-план каталогу', () => {
    let adminToken = jwt.sign({ userId: 1, rol: 'адмін' }, JWT_SECRET);
    
    // Ідентифікатори створених сутностей для тестів
    let testCategoryId;
    let testServiceId;
    let serviceWithSlotId;
    let testSpecialistId;

    beforeAll((done) => {
        db = new sqlite3.Database(dbPath, () => {
            // Створюємо базову категорію та послугу для тесту №10 (захист видалення)
            db.serialize(() => {
                db.run("INSERT INTO categories (nazva) VALUES ('Для тестів')", function() {
                    const catId = this.lastID;
                    db.run("INSERT INTO services (category_id, nazva, tryvalist_hv, cina) VALUES (?, 'Захищена послуга', 60, 500)", [catId], function() {
                        serviceWithSlotId = this.lastID;
                        db.run("INSERT INTO specialists (prizvyshche, imya) VALUES ('Тест', 'Спец')", function() {
                            const specId = this.lastID;
                            // Створюємо слот, щоб заблокувати видалення послуги
                            db.run("INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) VALUES (?, ?, '2026-06-01', '10:00', '11:00', 1, 'відкритий')", [serviceWithSlotId, specId], done);
                        });
                    });
                });
            });
        });
    });

    afterAll((done) => {
        db.close(done);
    });

    test('1. Відображення всіх категорій (без пропусків)', async () => {
        const res = await request(app).get('/api/catalog/categories');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('4. Адмін: додавання нової категорії ("Аквапарк")', async () => {
        const res = await request(app)
            .post('/api/catalog/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nazva: 'Аквапарк-Тест', opys: 'Опис аквапарку' });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.nazva).toBe('Аквапарк-Тест');
        testCategoryId = res.body.id; // Зберігаємо для наступного тесту
    });

    test('5. Адмін: додавання нової послуги', async () => {
        const res = await request(app)
            .post('/api/catalog/services')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                category_id: testCategoryId,
                nazva: 'Гірка Камікадзе',
                tryvalist_hv: 60,
                cina: 500
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.cina).toBe(500);
        testServiceId = res.body.id;
    });

    test('2. Фільтрація послуг за категорією', async () => {
        const res = await request(app).get(`/api/catalog/services?categoryId=${testCategoryId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].category_id).toBe(testCategoryId);
    });

    test('3. Деталі послуги (отримання одного запису)', async () => {
        const res = await request(app).get(`/api/catalog/services/${testServiceId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.nazva).toBe('Гірка Камікадзе');
        expect(res.body.tryvalist_hv).toBe(60);
    });

    test('6. Адмін: редагування ціни послуги (з 500 на 600)', async () => {
        const res = await request(app)
            .put(`/api/catalog/services/${testServiceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ cina: 600 });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.cina).toBe(600);
    });

    test('7. Адмін: видалення послуги без прив\'язаних слотів', async () => {
        const res = await request(app)
            .delete(`/api/catalog/services/${testServiceId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Послугу успішно видалено');
    });

    test('8. Адмін: додавання спеціаліста', async () => {
        const res = await request(app)
            .post('/api/catalog/specialists')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                prizvyshche: 'Петренко',
                imya: 'Олег',
                specializaciya: 'Масаж'
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.imya).toBe('Олег');
        testSpecialistId = res.body.id;
    });

    test('9. Адмін: редагування спеціаліста', async () => {
        const res = await request(app)
            .put(`/api/catalog/specialists/${testSpecialistId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ specializaciya: 'SPA та масаж' });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.specializaciya).toBe('SPA та масаж');
    });

    test('10. Захист від видалення послуги зі слотами', async () => {
        // Намагаємось видалити послугу, до якої ми прив'язали слот у beforeAll
        const res = await request(app)
            .delete(`/api/catalog/services/${serviceWithSlotId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('Неможливо видалити послугу');
    });
});