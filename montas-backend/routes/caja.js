const express = require('express');
const router = express.Router();
const controller = require('../controllers/cajaController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Toda la caja es información financiera sensible: solo admin.
router.use(requireAdmin);

router.get('/resumen', controller.getResumenDia);
router.get('/apertura', controller.getAperturaDia);
router.post('/apertura', controller.abrirCaja);
router.delete('/apertura/:id', controller.eliminarApertura);
router.get('/cierres', controller.listarCierres);
router.post('/cierres', controller.cerrarCaja);
router.delete('/cierres/:id', controller.eliminarCierre);
router.get('/movimientos', controller.getMovimientos);
router.get('/reportes', controller.getReportes);

module.exports = router;
