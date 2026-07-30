const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificacionesController');
const { requireStaff } = require('../middlewares/roleMiddleware');

router.use(requireStaff);
router.get('/pendientes', controller.getPendientes);

module.exports = router;
