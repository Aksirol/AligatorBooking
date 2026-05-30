const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Роздача статичних файлів (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Підключення API маршрутів
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

if (require.main === module) {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Сервер успішно запущено! Відкрийте http://localhost:${PORT} у браузері.`);
    });
}

module.exports = app;