const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json()); // Для парсингу JSON у тілі запиту

// Підключення маршрутів
app.use('/api/auth', authRoutes);

// Запуск сервера, якщо файл запускається напряму (не через тести)
if (require.main === module) {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Сервер запущено на http://localhost:${PORT}`);
    });
}

module.exports = app; // Експортуємо для тестів