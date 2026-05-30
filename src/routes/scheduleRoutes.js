const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Публічний маршрут (Клієнт переглядає актуальний розклад)
router.get('/', scheduleController.getSlots);

// Захищені маршрути (Адміністратор формує графік роботи)
router.post('/', verifyToken, requireAdmin, scheduleController.createSlot);
router.put('/:id', verifyToken, requireAdmin, scheduleController.updateSlot);
router.delete('/:id', verifyToken, requireAdmin, scheduleController.deleteSlot);

module.exports = router;