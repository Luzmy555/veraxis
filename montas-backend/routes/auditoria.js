const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditoriaController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/', requireAdmin, controller.listarAuditoria);

module.exports = router;
