const getDb = require('../db/database');

// [A5] Формування звітів (Дашборд) (Тест 4)
exports.getDashboardStats = (req, res) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
    
    db.serialize(() => {
        let stats = { bookings_today: 0, new_clients_week: 0 };

        // Кількість записів на сьогоднішню дату
        db.get(`
            SELECT COUNT(*) as count FROM bookings b
            JOIN slots s ON b.slot_id = s.id
            WHERE s.data = ? AND LOWER(b.status) != 'скасовано'
        `, [today], (err, row) => {
            if (!err && row) stats.bookings_today = row.count;

            // Кількість нових клієнтів за останні 7 днів
            db.get(`
                SELECT COUNT(*) as count FROM users 
                WHERE rol = 'клієнт' AND data_reyestr >= date('now', '-7 days')
            `, [], (err, row) => {
                if (!err && row) stats.new_clients_week = row.count;
                
                db.close();
                res.json(stats);
            });
        });
    });
};