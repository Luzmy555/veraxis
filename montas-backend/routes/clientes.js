const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientesController');
const { requireAdmin, requireStaff } = require('../middlewares/roleMiddleware');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

router.get('/me', controller.getMiExpediente);
router.get('/', requireStaff, controller.getClientes);
router.get('/seguimiento', requireStaff, controller.getSeguimiento);
router.post('/:id/foto', requireStaff, controller.upload.single('foto'), controller.subirFotoCliente);
router.post('/:id/acceso-portal', requireStaff, controller.crearAccesoPortal);
router.get('/:id', requireOwnClienteOrStaff('id'), controller.getClientePorId);
router.post('/', requireStaff, controller.crearCliente);
router.put('/:id', requireStaff, controller.actualizarCliente);
router.delete('/:id', requireAdmin, controller.eliminarCliente);

module.exports = router;
