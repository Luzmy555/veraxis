const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuariosController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Gestión de usuarios es exclusiva de admin.
router.use(requireAdmin);

router.get('/', controller.listarUsuarios);
router.post('/', controller.crearUsuario);
router.put('/:id', controller.actualizarUsuario);
router.patch('/:id/estado', controller.cambiarEstadoUsuario);

module.exports = router;
