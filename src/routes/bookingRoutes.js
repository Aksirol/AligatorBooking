const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Усі операції із записами вимагають автентифікації
router.use(verifyToken);

router.post('/', bookingController.createBooking);                 // Клієнт: Створити запис (K2)
router.get('/my', bookingController.getMyBookings);                // Клієнт: Мої записи (K3)
router.get('/admin', requireAdmin, bookingController.getAllBookings); // Адмін: Черга записів (A3)
router.put('/:id/status', bookingController.updateBookingStatus);  // Клієнт/Адмін: Зміна статусу (K4, A3)

module.exports = router;