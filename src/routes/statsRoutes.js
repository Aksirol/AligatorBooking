const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireAdmin, statsController.getDashboardStats); // Адмін: A5

module.exports = router;