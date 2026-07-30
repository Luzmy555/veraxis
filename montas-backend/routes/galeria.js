const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/galeriaController');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { mediaFileFilter, MAX_MEDIA_SIZE } = require('../middlewares/uploadValidationMedia');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'config');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsRoot),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: MAX_MEDIA_SIZE }, fileFilter: mediaFileFilter });

router.get('/', controller.listarGaleria);
router.post('/', requireAdmin, upload.single('archivo'), controller.crearItemGaleria);
router.patch('/:id/mover', requireAdmin, controller.moverItemGaleria);
router.delete('/:id', requireAdmin, controller.eliminarItemGaleria);

module.exports = router;
