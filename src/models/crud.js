const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

function getDbConnection() {
    return new sqlite3.Database(dbPath);
}

// Приклад: Отримання каталогу послуг та часових слотів
function getAvailableSlots(callback) {
    const db = getDbConnection();
    const query = `
        SELECT s.id, s.data, s.chas_poch, s.maks_misc, s.status, 
               srv.nazva AS service_name, 
               (s.maks_misc - (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status = 'підтверджено')) AS vilni_miscya
        FROM slots s
        JOIN services srv ON s.service_id = srv.id
        WHERE s.status = 'відкритий'
    `;
    
    db.all(query, [], (err, rows) => {
        db.close();
        callback(err, rows);
    });
}

module.exports = {
    getAvailableSlots
};