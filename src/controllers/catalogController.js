const getDb = require('../db/database');

// --- КАТЕГОРІЇ ---
exports.getCategories = (req, res) => {
    const db = getDb();
    db.all("SELECT * FROM categories", [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.createCategory = (req, res) => {
    const { nazva, opys } = req.body;
    const db = getDb();
    db.run("INSERT INTO categories (nazva, opys) VALUES (?, ?)", [nazva, opys], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nazva, opys });
    });
};

// --- ПОСЛУГИ ---
exports.getServices = (req, res) => {
    const { categoryId } = req.query; // Тест 2: Фільтрація
    const db = getDb();
    
    let query = `SELECT s.*, c.nazva AS category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id`;
    let params = [];
    
    if (categoryId) {
        query += ` WHERE s.category_id = ?`;
        params.push(categoryId);
    }
    
    db.all(query, params, (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getServiceById = (req, res) => {
    // Тест 3: Деталі послуги
    const { id } = req.params;
    const db = getDb();
    db.get("SELECT * FROM services WHERE id = ?", [id], (err, row) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Послугу не знайдено' });
        res.json(row);
    });
};

exports.createService = (req, res) => {
    const { category_id, nazva, opys, tryvalist_hv, cina } = req.body;
    const db = getDb();
    db.run(`INSERT INTO services (category_id, nazva, opys, tryvalist_hv, cina) VALUES (?, ?, ?, ?, ?)`, 
        [category_id, nazva, opys, tryvalist_hv, cina], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, category_id, nazva, tryvalist_hv, cina });
    });
};

exports.updateService = (req, res) => {
    // Тест 6: Редагування ціни
    const { id } = req.params;
    const { cina } = req.body; // Спрощено для тесту (оновлюємо лише ціну)
    const db = getDb();
    
    db.run("UPDATE services SET cina = ? WHERE id = ?", [cina, id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Послугу оновлено', id, cina });
    });
};

exports.deleteService = (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    // Тест 10: Захист від видалення послуги зі слотами
    db.get("SELECT COUNT(*) AS count FROM slots WHERE service_id = ?", [id], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        if (row.count > 0) {
            db.close();
            return res.status(400).json({ error: 'Неможливо видалити послугу, оскільки до неї прив\'язані активні часові слоти.' });
        }
        
        // Тест 7: Видалення послуги без слотів
        db.run("DELETE FROM services WHERE id = ?", [id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Послугу успішно видалено' });
        });
    });
};

// --- СПЕЦІАЛІСТИ ---
exports.getSpecialists = (req, res) => {
    const db = getDb();
    db.all("SELECT * FROM specialists", [], (err, rows) => {
        db.close();
        res.json(rows);
    });
};

exports.createSpecialist = (req, res) => {
    const { prizvyshche, imya, specializaciya, telefon } = req.body;
    const db = getDb();
    db.run(`INSERT INTO specialists (prizvyshche, imya, specializaciya, telefon) VALUES (?, ?, ?, ?)`, 
        [prizvyshche, imya, specializaciya, telefon], function(err) {
        db.close();
        res.status(201).json({ id: this.lastID, prizvyshche, imya, specializaciya });
    });
};

exports.updateSpecialist = (req, res) => {
    // Тест 9: Редагування спеціаліста
    const { id } = req.params;
    const { specializaciya } = req.body;
    const db = getDb();
    
    db.run("UPDATE specialists SET specializaciya = ? WHERE id = ?", [specializaciya, id], function(err) {
        db.close();
        res.json({ message: 'Спеціаліста оновлено', specializaciya });
    });
};