const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

function getDb() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Помилка підключення до БД:', err.message);
    });
    
    // Вмикаємо підтримку зовнішніх ключів (CASCADE / SET NULL) для кожного з'єднання
    db.run("PRAGMA foreign_keys = ON;"); 
    
    return db;
}

module.exports = getDb;