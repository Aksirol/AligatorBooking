const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const getDb = require('../db/database');

const JWT_SECRET = 'super_secret_key_aligator'; 

// [G1] Реєстрація клієнта
const register = async (req, res) => {
    const { prizvyshche, imya, email, telefon, parol } = req.body;

    // Тест-кейс №3: Перевірка на порожні обов'язкові поля
    if (!prizvyshche || !imya || !email || !parol) {
        return res.status(400).json({ error: 'Заповніть усі обов\'язкові поля' });
    }

    // Тест-кейс №4: Перевірка формату email за допомогою регулярного виразу
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Введіть коректну адресу електронної пошти' });
    }

    const db = getDb();

    try {
        db.get(`SELECT id FROM users WHERE email = ?`, [email], async (err, row) => {
            // Тест-кейс №2: Дублікат email
            if (row) {
                db.close();
                return res.status(400).json({ error: 'Користувач з таким email вже існує' });
            }

            const saltRounds = 10;
            const parol_hash = await bcrypt.hash(parol, saltRounds);
            const rol = 'клієнт'; 

            const insertQuery = `INSERT INTO users (prizvyshche, imya, email, telefon, parol_hash, rol) VALUES (?, ?, ?, ?, ?, ?)`;
            
            db.run(insertQuery, [prizvyshche, imya, email, telefon, parol_hash, rol], function(err) {
                db.close();
                if (err) return res.status(500).json({ error: 'Помилка при збереженні' });
                
                // Тест-кейс №1: Успішна реєстрація
                res.status(201).json({ message: 'Клієнта успішно зареєстровано', userId: this.lastID, rol });
            });
        });
    } catch (error) {
        db.close();
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

// [K1] Авторизація клієнта/адміна
const login = (req, res) => {
    const { email, parol } = req.body;
    const db = getDb();

    db.get(`SELECT id, parol_hash, rol FROM users WHERE email = ?`, [email], async (err, user) => {
        db.close();
        
        // Тест-кейс №8: Вхід з неіснуючим email
        if (err || !user) {
            return res.status(401).json({ error: 'Невірний логін або пароль' });
        }

        const validPass = await bcrypt.compare(parol, user.parol_hash);
        if (!validPass) {
            return res.status(401).json({ error: 'Невірний логін або пароль' });
        }

        // Тест-кейс №5 та №6: Успішний вхід
        const token = jwt.sign({ userId: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Авторизація успішна', token, rol: user.rol });
    });
};

module.exports = { register, login };