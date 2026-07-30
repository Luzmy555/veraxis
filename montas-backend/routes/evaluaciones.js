const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteEvaluacionesController');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

router.get('/:id/evaluaciones', requireOwnClienteOrStaff('id'), controller.listarEvaluaciones);
router.post('/:id/evaluaciones', controller.crearEvaluacion);
router.put('/:id/evaluaciones/:evalId', controller.actualizarEvaluacion);
router.delete('/:id/evaluaciones/:evalId', controller.eliminarEvaluacion);

module.exports = router;
