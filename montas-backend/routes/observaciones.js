const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteObservacionesController');

router.get('/:id/observaciones', controller.listarObservaciones);
router.post('/:id/observaciones', controller.crearObservacion);
router.delete('/:id/observaciones/:obsId', controller.eliminarObservacion);

module.exports = router;
