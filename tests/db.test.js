const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');

describe('Фаза 1: Тестування сховища даних (SQLite)', () => {
    let db;

    // Підключаємось до БД перед початком усіх тестів
    beforeAll((done) => {
        db = new sqlite3.Database(dbPath, done);
    });

    // Закриваємо з'єднання після завершення тестів
    afterAll((done) => {
        db.close(done);
    });

    // --- Тест-кейс №2: Наявність усіх таблиць ---
    test('Мають бути присутні всі 6 обов\'язкових таблиць', (done) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
            expect(err).toBeNull();
            
            const tableNames = tables.map(t => t.name);
            const requiredTables = ['users', 'categories', 'services', 'specialists', 'slots', 'bookings'];
            
            requiredTables.forEach(table => {
                expect(tableNames).toContain(table);
            });
            done();
        });
    });

    // --- Тест-кейс №3: Завантаження тестових даних ---
    test('Дані коректно зчитуються (мінімальна перевірка seed)', (done) => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            expect(err).toBeNull();
            expect(row.count).toBeGreaterThan(0); // Перевіряємо, що seed відпрацював
            done();
        });
    });

    // --- Тест-кейс №8: CRUD запис і читання ---
    test('CRUD: запис і читання тестового об\'єкта в таблицю categories', (done) => {
        const testObj = { name: 'Тест', desc: 'Тестовий опис' };
        
        // 1. Записуємо об'єкт
        db.run("INSERT INTO categories (nazva, opys) VALUES (?, ?)", [testObj.name, testObj.desc], function(err) {
            expect(err).toBeNull();
            const lastId = this.lastID; // Отримуємо id нового запису
            
            // 2. Читаємо об'єкт
            db.get("SELECT * FROM categories WHERE id = ?", [lastId], (err, row) => {
                expect(err).toBeNull();
                expect(row).toBeDefined();
                expect(row.nazva).toBe(testObj.name); // Поля співпадають
                
                // 3. Видаляємо тестовий запис (очищення після тесту)
                db.run("DELETE FROM categories WHERE id = ?", [lastId], done);
            });
        });
    });
});