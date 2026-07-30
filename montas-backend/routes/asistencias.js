const express = require('express');
const router = express.Router();
const controller = require('../controllers/asistenciasController');
const { requireStaff } = require('../middlewares/roleMiddleware');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

router.get('/', requireStaff, controller.obtenerAsistencias);
router.get('/cliente/:id', requireOwnClienteOrStaff('id'), controller.obtenerAsistenciasPorCliente);
// Soporta también la ruta /api/asistencias/:id usada por el frontend
router.get('/:id', requireOwnClienteOrStaff('id'), controller.obtenerAsistenciasPorCliente);
router.post('/', requireStaff, controller.crearAsistencia);

module.exports = router;
