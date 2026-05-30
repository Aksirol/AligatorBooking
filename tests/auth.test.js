const request = require('supertest');
const app = require('../src/server');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../database.sqlite');
let db;

describe('Фаза 2: Автентифікація та Авторизація (Розширений тест-план)', () => {
    let clientToken;
    let adminToken;
    const testAdminPass = 'AdminTest123';
    const testClientPass = 'Test1234';

    beforeAll((done) => {
        db = new sqlite3.Database(dbPath, async () => {
            // Створюємо справжнього адміна для тесту №6 з валідним хешем
            const hash = await bcrypt.hash(testAdminPass, 10);
            db.run(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol) 
                    VALUES ('Адмін', 'Тест', 'admin_test@test.ua', '0000000', ?, 'адмін')`, [hash], done);
        });
    });

    afterAll((done) => {
        // Очищаємо тестові дані
        db.run("DELETE FROM users WHERE email = 'ivan@test.ua' OR email = 'admin_test@test.ua'", () => {
            db.close(done);
        });
    });

    // --- Блок Реєстрації ---

    test('1. Реєстрація з валідними даними', async () => {
        const res = await request(app).post('/api/auth/register').send({
            prizvyshche: 'Іванов', imya: 'Іван', email: 'ivan@test.ua', telefon: '0501234567', parol: testClientPass
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.rol).toBe('клієнт');
    });

    test('2. Реєстрація дублікатом email', async () => {
        const res = await request(app).post('/api/auth/register').send({
            prizvyshche: 'Іванов', imya: 'Іван', email: 'ivan@test.ua', telefon: '0501234567', parol: testClientPass
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Користувач з таким email вже існує');
    });

    test('3. Реєстрація з порожніми полями', async () => {
        const res = await request(app).post('/api/auth/register').send({
            imya: 'Іван', email: 'empty@test.ua' // Відсутні prizvyshche та parol
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('обов\'язкові поля');
    });

    test('4. Реєстрація з некоректним email', async () => {
        const res = await request(app).post('/api/auth/register').send({
            prizvyshche: 'Іванов', imya: 'Іван', email: 'не_email', telefon: '0501234567', parol: testClientPass
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Введіть коректну адресу електронної пошти');
    });

    // --- Блок Авторизації ---

    test('5. Вхід з правильними даними (клієнт)', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ivan@test.ua', parol: testClientPass
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.rol).toBe('клієнт');
        clientToken = res.body.token; 
    });

    test('6. Вхід з правильними даними (адмін)', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'admin_test@test.ua', parol: testAdminPass
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.rol).toBe('адмін');
        adminToken = res.body.token;
    });

    test('7. Вхід з невірним паролем', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ivan@test.ua', parol: 'WrongPassword'
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Невірний логін або пароль');
    });

    test('8. Вхід з неіснуючим email', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ghost@test.ua', parol: testClientPass
        });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Невірний логін або пароль');
    });

    // --- Блок Доступу (Імітація тестів 9-11 для API) ---

    test('9 & 10. Прямий URL до захищеної сторінки без авторизації', async () => {
        // Запит без заголовка Authorization
        const res = await request(app).get('/api/auth/profile');
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toContain('Токен не надано');
    });

    test('11. Клієнт не має доступу до адмін-інтерфейсу', async () => {
        const res = await request(app)
            .get('/api/auth/admin-panel')
            .set('Authorization', `Bearer ${clientToken}`); // Використовуємо токен клієнта
        
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toBe('Доступ дозволено лише адміністраторам');
    });

    test('Бонус: Адмін має доступ до адмін-інтерфейсу', async () => {
        const res = await request(app)
            .get('/api/auth/admin-panel')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
    });
});