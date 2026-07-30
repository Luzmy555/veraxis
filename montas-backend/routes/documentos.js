const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/clienteDocumentosController');
const { fileFilter, MAX_FILE_SIZE } = require('../middlewares/uploadValidation');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'clientes');
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

router.post('/:id/documentos', upload.single('file'), controller.subirDocumento);
router.get('/:id/documentos', requireOwnClienteOrStaff('id'), controller.listarDocumentos);
router.get('/:id/documentos/:docId/download', requireOwnClienteOrStaff('id'), controller.descargarDocumento);
router.get('/:id/documentos/:docId', requireOwnClienteOrStaff('id'), controller.descargarDocumento);
router.delete('/:id/documentos/:docId', controller.eliminarDocumento);

module.exports = router;
