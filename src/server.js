const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes'); // Додано

const app = express();

app.use(cors());
app.use(express.json());

// Підключення маршрутів
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes); // Додано

if (require.main === module) {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Сервер запущено на http://localhost:${PORT}`);
    });
}

module.exports = app;