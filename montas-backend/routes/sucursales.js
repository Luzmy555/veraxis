const express = require('express');
const router = express.Router();
const controller = require('../controllers/sucursalesController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/', controller.getSucursales);
router.post('/', requireAdmin, controller.crearSucursal);
router.put('/:id', requireAdmin, controller.actualizarSucursal);

module.exports = router;
