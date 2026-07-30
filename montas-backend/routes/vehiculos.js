const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehiculosController');
const mantenimientos = require('../controllers/vehiculoMantenimientosController');
const { requireAdmin, requireStaff } = require('../middlewares/roleMiddleware');

router.get('/', controller.getVehiculos);
router.get('/:id', controller.getVehiculoPorId);
router.post('/', requireAdmin, controller.crearVehiculo);
router.put('/:id', requireAdmin, controller.actualizarVehiculo);
router.delete('/:id', requireAdmin, controller.eliminarVehiculo);

router.get('/:id/mantenimientos', mantenimientos.listarMantenimientos);
router.post('/:id/mantenimientos', requireStaff, mantenimientos.crearMantenimiento);
router.delete('/:id/mantenimientos/:mantId', requireAdmin, mantenimientos.eliminarMantenimiento);

module.exports = router;
