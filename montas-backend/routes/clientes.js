const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientesController');

router.get('/', controller.getClientes);
router.post('/:id/foto', controller.upload.single('foto'), controller.subirFotoCliente);
router.get('/:id', controller.getClientePorId);
router.post('/', controller.crearCliente);
router.put('/:id', controller.actualizarCliente);
router.delete('/:id', controller.eliminarCliente);

module.exports = router;
