const express = require('express');
const router = express.Router();
const controller = require('../controllers/instructoresController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/', controller.getInstructores);
router.get('/me', controller.getMiPerfilInstructor);
router.get('/:id', controller.getInstructorPorId);
router.post('/', requireAdmin, controller.crearInstructor);
router.put('/:id', requireAdmin, controller.actualizarInstructor);
router.delete('/:id', requireAdmin, controller.eliminarInstructor);

module.exports = router;
