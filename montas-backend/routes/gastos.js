const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/gastosController');
const { fileFilter, MAX_FILE_SIZE } = require('../middlewares/uploadValidation');
const { requireAdmin } = require('../middlewares/roleMiddleware');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'gastos');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// Todo el módulo de gastos es información financiera sensible: solo admin.
router.use(requireAdmin);

router.get('/categorias', controller.listarCategorias);
router.post('/categorias', controller.crearCategoria);
router.delete('/categorias/:id', controller.eliminarCategoria);

router.get('/', controller.listarGastos);
router.get('/export.csv', controller.exportarCsv);
router.get('/:id/comprobante', controller.descargarComprobante);
router.post('/', upload.single('comprobante'), controller.crearGasto);
router.put('/:id', controller.actualizarGasto);
router.delete('/:id', controller.eliminarGasto);

module.exports = router;
