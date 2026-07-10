const express = require('express');
const router = express.Router();
const controller = require('../controllers/cursosController');
const { requireAdmin } = require('../middlewares/roleMiddleware');

router.get('/', controller.getCursos);
router.get('/instructor/:instructor_id', controller.getCursosDelInstructor);
router.get('/:id/instructores', controller.getInstructoresDeCurso);
router.get('/:id', controller.getCursoPorId);
router.post('/', requireAdmin, controller.crearCurso);
router.put('/:id/instructores', requireAdmin, controller.asignarInstructoresCurso);
router.put('/:id', requireAdmin, controller.actualizarCurso);
router.delete('/:id', requireAdmin, controller.eliminarCurso);

module.exports = router;
