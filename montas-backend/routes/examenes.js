const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteExamenesController');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

router.get('/:id/examenes', requireOwnClienteOrStaff('id'), controller.listarExamenes);
router.post('/:id/examenes', controller.crearExamen);
router.put('/:id/examenes/:examId', controller.actualizarExamen);
router.delete('/:id/examenes/:examId', controller.eliminarExamen);

module.exports = router;
