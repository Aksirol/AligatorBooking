const getDb = require('../db/database');

// Клієнт та Адмін: Отримання розкладу (з розрахунком вільних місць)
exports.getSlots = (req, res) => {
    const { date, serviceId } = req.query; 
    const db = getDb();

    // ВИПРАВЛЕННЯ: Використовуємо NOT IN для кирилиці замість LOWER()
    let query = `
        SELECT sl.id, sl.data, sl.chas_poch, sl.chas_kin, sl.maks_misc, sl.status,
               srv.nazva AS service_name, srv.tryvalist_hv, srv.cina,
               sp.prizvyshche AS spec_prizvyshche, sp.imya AS spec_imya,
               (sl.maks_misc - (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = sl.id AND b.status NOT IN ('Скасовано', 'скасовано'))) AS vilni_miscya
        FROM slots sl
        JOIN services srv ON sl.service_id = srv.id
        LEFT JOIN specialists sp ON sl.specialist_id = sp.id
        WHERE 1=1
    `;
    let params = [];

    if (date) {
        query += ` AND sl.data = ?`;
        params.push(date);
    }
    if (serviceId) {
        query += ` AND sl.service_id = ?`;
        params.push(serviceId);
    }

    query += ` ORDER BY sl.data, sl.chas_poch`;

    db.all(query, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// Адмін: Створення нового часового слоту
exports.createSlot = (req, res) => {
    const { service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status } = req.body;
    const db = getDb();
    
    const query = `INSERT INTO slots (service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const slotStatus = status || 'відкритий';

    db.run(query, [service_id, specialist_id, data, chas_poch, chas_kin, maks_misc, slotStatus], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Слот успішно створено' });
    });
};

// Адмін: Редагування слоту (наприклад, зміна статусу на "заблоковано")
exports.updateSlot = (req, res) => {
    const { id } = req.params;
    const { data, chas_poch, chas_kin, maks_misc, status } = req.body;
    const db = getDb();
    
    const query = `UPDATE slots SET data = ?, chas_poch = ?, chas_kin = ?, maks_misc = ?, status = ? WHERE id = ?`;
    
    db.run(query, [data, chas_poch, chas_kin, maks_misc, status, id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Слот оновлено', id });
    });
};

// Адмін: Видалення слоту (із захистом від видалення слотів із записами)
exports.deleteSlot = (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    db.get("SELECT COUNT(*) AS count FROM bookings WHERE slot_id = ?", [id], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        if (row.count > 0) {
            db.close();
            return res.status(400).json({ error: 'Неможливо видалити слот, на який вже існують записи клієнтів' });
        }
        
        db.run("DELETE FROM slots WHERE id = ?", [id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Слот видалено' });
        });
    });
};