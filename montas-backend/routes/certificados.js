const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/clienteCertificadosController');
const { fileFilter, MAX_FILE_SIZE } = require('../middlewares/uploadValidation');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'certificados');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clienteId = req.params.id;
    const dir = path.join(uploadsRoot, String(clienteId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, unique);
  }
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

router.get('/:id/certificados', requireOwnClienteOrStaff('id'), controller.listarCertificados);
router.post('/:id/certificados', upload.single('archivo'), controller.crearCertificado);
router.get('/:id/certificados/:certId/download', requireOwnClienteOrStaff('id'), controller.descargarCertificado);
router.get('/:id/certificados/:certId', requireOwnClienteOrStaff('id'), controller.getCertificadoPorId);
router.put('/:id/certificados/:certId', controller.actualizarCertificado);
router.delete('/:id/certificados/:certId', controller.eliminarCertificado);

module.exports = router;
