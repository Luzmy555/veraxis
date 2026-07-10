const express = require('express');
const router = express.Router();
const controller = require('../controllers/configuracionController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/', controller.getConfiguracion);
router.put('/', requireAdmin, controller.updateConfiguracion);
router.post('/usuario', requireAdmin, controller.updateUsuario);
router.put('/usuario/self', controller.updateUsuarioSelf);
router.post('/login', controller.login);

module.exports = router;
