const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Створення або підключення до файлу БД
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Помилка підключення до БД:', err.message);
    } else {
        console.log('Успішне підключення до SQLite бази даних.');
    }
});

// Дозволяємо використання зовнішніх ключів у SQLite
db.run("PRAGMA foreign_keys = ON;");

db.serialize(() => {
    // 1. Створення таблиць
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nazva TEXT NOT NULL,
            opys TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prizvyshche TEXT NOT NULL,
            imya TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            telefon TEXT,
            parol_hash TEXT NOT NULL,
            rol TEXT NOT NULL,
            data_reyestr DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            nazva TEXT NOT NULL,
            opys TEXT,
            tryvalist_hv INTEGER NOT NULL,
            cina DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS specialists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prizvyshche TEXT NOT NULL,
            imya TEXT NOT NULL,
            specializaciya TEXT,
            telefon TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER,
            specialist_id INTEGER,
            data DATE NOT NULL,
            chas_poch TIME NOT NULL,
            chas_kin TIME NOT NULL,
            maks_misc INTEGER NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE SET NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            slot_id INTEGER,
            data_stvor DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL,
            komentar TEXT,
            FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
        )
    `, () => {
        console.log('Всі таблиці успішно перевірено/створено.');
        
        // 2. Наповнення тестовими даними (Seed)
        // Виконуємо запит ТІЛЬКИ після створення всіх таблиць
        db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
            if (err) {
                console.error('Помилка при перевірці даних:', err.message);
                db.close();
                return;
            }

            if (row.count === 0) {
                console.log('Завантаження початкових даних (Seed)...');
                
                // Використовуємо serialize всередині колбеку, щоб INSERT виконувались по черзі
                db.serialize(() => {
                    db.run(`INSERT INTO categories (nazva, opys) VALUES ('Аквапарк', 'Басейни та гірки'), ('Фітнес', 'Групові заняття')`);
                    
                    const adminPassHash = bcrypt.hashSync('hashed_pass_1', 10);
                    const clientPassHash = bcrypt.hashSync('hashed_pass_2', 10);

                    db.run(`INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol) VALUES 
                        ('Адміненко', 'Іван', 'admin@aligator.com', '0501234567', '${adminPassHash}', 'адмін'),
                        ('Петренко', 'Анна', 'anna@mail.com', '0971234567', '${clientPassHash}', 'клієнт')`);
                    
                    db.run(`INSERT INTO services (category_id, nazva, opys, tryvalist_hv, cina) VALUES (2, 'Зумба', 'Кардіо тренування', 60, 250.00)`);
                    
                    db.run(`INSERT INTO specialists (prizvyshche, imya, specializaciya, telefon) VALUES ('Коваль', 'Марія', 'Тренер з фітнесу', '0631234567')`);
                    
                    db.run(`INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) 
                        VALUES (1, 1, '2026-06-01', '18:00', '19:00', 10, 'відкритий')`);
                    
                    // На останньому запиті викликаємо колбек для закриття БД
                    db.run(`INSERT INTO bookings (client_id, slot_id, status, komentar) VALUES (2, 1, 'підтверджено', 'Перше відвідування')`, (err) => {
                        if (err) {
                            console.error('Помилка при додаванні запису:', err.message);
                        } else {
                            console.log('Тестові дані успішно завантажено!');
                        }
                        
                        // Закриваємо з'єднання ТІЛЬКИ після завершення всіх операцій
                        db.close(() => {
                            console.log('З\'єднання з БД закрито.');
                        });
                    });
                });
            } else {
                console.log('Тестові дані вже існують в базі. Пропускаємо Seed.');
                db.close(() => {
                    console.log('З\'єднання з БД закрито.');
                });
            }
        });
    });
});