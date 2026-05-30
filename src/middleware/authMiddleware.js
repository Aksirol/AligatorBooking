const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super_secret_key_aligator';

// Перевірка наявності та валідності токена
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(403).json({ error: 'Токен не надано. Доступ заборонено.' });
    }

    try {
        // Очікуємо формат "Bearer <token>"
        const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
        req.user = decoded; // Зберігаємо дані користувача у запиті
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Недійсний токен' });
    }
};

// Перевірка ролі адміністратора 
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'адмін') {
        next();
    } else {
        res.status(403).json({ error: 'Доступ дозволено лише адміністраторам' });
    }
};

module.exports = { verifyToken, requireAdmin };