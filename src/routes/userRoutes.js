const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.put('/profile', verifyToken, userController.updateProfile); // Клієнт: K5
router.get('/', verifyToken, requireAdmin, userController.getAllUsers); // Адмін: A4

module.exports = router;