const express = require('express');
const router = express.Router();
const controller = require('../controllers/asistenciasController');

router.get('/', controller.obtenerAsistencias);
router.get('/cliente/:id', controller.obtenerAsistenciasPorCliente);
// Soporta también la ruta /api/asistencias/:id usada por el frontend
router.get('/:id', controller.obtenerAsistenciasPorCliente);
router.post('/', controller.crearAsistencia);

module.exports = router;
