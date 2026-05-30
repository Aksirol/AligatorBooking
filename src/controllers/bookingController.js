const getDb = require('../db/database');

// [K2] Створення запису клієнтом
exports.createBooking = (req, res) => {
    const { slot_id, komentar } = req.body;
    const client_id = req.user.userId;
    const db = getDb();

    // Тест 6: Перевірка на подвійний запис
    db.get(`SELECT id FROM bookings WHERE client_id = ? AND slot_id = ? AND status != 'Скасовано'`, 
        [client_id, slot_id], (err, row) => {
        if (err) { db.close(); return res.status(500).json({ error: err.message }); }
        if (row) {
            db.close();
            return res.status(400).json({ error: 'Ви вже записані на цей сеанс' });
        }

        // Тест 4, 5: Перевірка статусу слоту та наявності вільних місць
        const slotQuery = `
            SELECT sl.maks_misc, sl.status,
                   (sl.maks_misc - (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = sl.id AND b.status != 'Скасовано')) AS vilni_miscya
            FROM slots sl WHERE sl.id = ?
        `;

        db.get(slotQuery, [slot_id], (err, slot) => {
            if (err) { db.close(); return res.status(500).json({ error: err.message }); }
            if (!slot) { db.close(); return res.status(404).json({ error: 'Часовий слот не знайдено' }); }
            
            if (slot.status === 'Заблокований' || slot.status === 'заблоковано') {
                db.close();
                return res.status(400).json({ error: 'Цей часовий слот заблокований для запису' });
            }

            if (slot.vilni_miscya <= 0) {
                db.close();
                return res.status(400).json({ error: 'На жаль, вільних місць немає' });
            }

            // Фіксація запису (Тест 2)
            const insertQuery = `INSERT INTO bookings (client_id, slot_id, status, komentar) VALUES (?, ?, 'Очікує підтвердження', ?)`;
            db.run(insertQuery, [client_id, slot_id, komentar], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Запис збережено', bookingId: this.lastID, status: 'Очікує підтвердження' });
            });
        });
    });
};

// [K3] Перегляд власних записів клієнтом (Тест 3)
exports.getMyBookings = (req, res) => {
    const client_id = req.user.userId;
    const db = getDb();

    const query = `
        SELECT b.id AS booking_id, b.data_stvor, b.status AS booking_status, b.komentar,
               sl.data, sl.chas_poch, srv.nazva AS service_name, srv.cina,
               sp.prizvyshche AS spec_prizvyshche
        FROM bookings b
        JOIN slots sl ON b.slot_id = sl.id
        JOIN services srv ON sl.service_id = srv.id
        LEFT JOIN specialists sp ON sl.specialist_id = sp.id
        WHERE b.client_id = ?
        ORDER BY b.data_stvor DESC
    `;

    db.all(query, [client_id], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// [A3] Перегляд усіх записів для адміністратора
exports.getAllBookings = (req, res) => {
    const db = getDb();
    const query = `
        SELECT b.id AS booking_id, b.status AS booking_status, b.komentar, b.data_stvor,
               u.prizvyshche, u.imya, u.email, u.telefon,
               sl.data, sl.chas_poch, srv.nazva AS service_name
        FROM bookings b
        JOIN users u ON b.client_id = u.id
        JOIN slots sl ON b.slot_id = sl.id
        JOIN services srv ON sl.service_id = srv.id
        ORDER BY b.data_stvor DESC
    `;

    db.all(query, [], (err, rows) => {
        db.close();
        res.json(rows);
    });
};

// [K4, A3] Зміна статусу (Підтвердження / Скасування) (Тести 7, 8)
exports.updateBookingStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    const { userId, rol } = req.user;
    const db = getDb();

    db.get("SELECT client_id FROM bookings WHERE id = ?", [id], (err, booking) => {
        if (err) { db.close(); return res.status(500).json({ error: err.message }); }
        if (!booking) { db.close(); return res.status(404).json({ error: 'Запис не знайдено' }); }

        if (rol !== 'адмін') {
            if (booking.client_id !== userId) {
                db.close();
                return res.status(403).json({ error: 'Дія заборонена. Це не ваш запис.' });
            }
            if (status !== 'Скасовано') {
                db.close();
                return res.status(400).json({ error: 'Клієнт може лише скасувати запис.' });
            }
        }

        db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Статус запису змінено на "${status}"`, id, status });
        });
    });
};