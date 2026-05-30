const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Тестовий захищений маршрут для клієнта
router.get('/profile', verifyToken, (req, res) => {
    res.json({ message: 'Це захищена сторінка профілю', user: req.user });
});

// Тестовий захищений маршрут для адміністратора
router.get('/admin-panel', verifyToken, requireAdmin, (req, res) => {
    res.json({ message: 'Вітаємо в панелі адміністратора' });
});

module.exports = router;