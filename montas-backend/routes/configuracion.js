const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/configuracionController');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { fileFilter, MAX_FILE_SIZE } = require('../middlewares/uploadValidation');
const { mediaFileFilter, MAX_MEDIA_SIZE } = require('../middlewares/uploadValidationMedia');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'config');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsRoot),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });
const uploadMedia = multer({ storage, limits: { fileSize: MAX_MEDIA_SIZE }, fileFilter: mediaFileFilter });

router.get('/branding', controller.getBrandingPublico);
router.get('/portada', controller.getPortadaPublica);
router.get('/', controller.getConfiguracion);
router.get('/usuarios', requireAdmin, controller.listarUsuarios);
router.put('/', requireAdmin, controller.updateConfiguracion);
router.post('/logo', requireAdmin, upload.single('logo'), controller.subirLogo);
router.post('/portada/video', requireAdmin, uploadMedia.single('video'), controller.subirPortadaVideo);
router.post('/portada/nosotros-imagen', requireAdmin, uploadMedia.single('imagen'), controller.subirNosotrosImagen);
router.post('/usuario', requireAdmin, controller.updateUsuario);
router.get('/usuario/self', controller.getUsuarioSelf);
router.put('/usuario/self', controller.updateUsuarioSelf);

module.exports = router;
