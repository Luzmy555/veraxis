const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportesController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Reportes ejecutivos combinan datos financieros y de rendimiento por instructor: solo admin.
router.use(requireAdmin);

router.get('/ejecutivo', controller.getEjecutivo);

module.exports = router;
