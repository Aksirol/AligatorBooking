const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Публічні маршрути
router.get('/categories', catalogController.getCategories);
router.get('/services', catalogController.getServices);
router.get('/services/:id', catalogController.getServiceById);
router.get('/specialists', catalogController.getSpecialists);

// Захищені маршрути адміністратора
router.post('/categories', verifyToken, requireAdmin, catalogController.createCategory);
router.post('/services', verifyToken, requireAdmin, catalogController.createService);
router.put('/services/:id', verifyToken, requireAdmin, catalogController.updateService);
router.delete('/services/:id', verifyToken, requireAdmin, catalogController.deleteService);

router.post('/specialists', verifyToken, requireAdmin, catalogController.createSpecialist);
router.put('/specialists/:id', verifyToken, requireAdmin, catalogController.updateSpecialist);

module.exports = router;