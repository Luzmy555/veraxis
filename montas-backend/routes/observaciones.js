const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteObservacionesController');
const { requireStaff } = require('../middlewares/roleMiddleware');

// Notas internas del staff: nunca visibles para el portal del estudiante.
router.get('/:id/observaciones', requireStaff, controller.listarObservaciones);
router.post('/:id/observaciones', requireStaff, controller.crearObservacion);
router.delete('/:id/observaciones/:obsId', controller.eliminarObservacion);

module.exports = router;
