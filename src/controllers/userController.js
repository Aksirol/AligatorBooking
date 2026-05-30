const getDb = require('../db/database');

// [K5] Редагування профілю клієнтом (Тест 3)
exports.updateProfile = (req, res) => {
    const { prizvyshche, imya, telefon } = req.body;
    const userId = req.user.userId;
    const db = getDb();

    db.run("UPDATE users SET prizvyshche = ?, imya = ?, telefon = ? WHERE id = ?",
        [prizvyshche, imya, telefon, userId], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Профіль успішно оновлено' });
    });
};

// [A4] Управління клієнтами з пошуком (Тести 1, 2)
exports.getAllUsers = (req, res) => {
    const { search } = req.query;
    const db = getDb();
    
    db.all("SELECT id, prizvyshche, imya, email, telefon, rol, data_reyestr FROM users WHERE rol = 'клієнт'", [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });

        let result = rows;
        // Реалізація пошуку без урахування регістру (надійно для кирилиці)
        if (search) {
            const s = search.toLowerCase();
            result = rows.filter(u => 
                (u.imya && u.imya.toLowerCase().includes(s)) || 
                (u.email && u.email.toLowerCase().includes(s)) ||
                (u.prizvyshche && u.prizvyshche.toLowerCase().includes(s))
            );
        }
        res.json(result);
    });
};