const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/clienteDocumentosController');

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

const upload = multer({ storage });

router.post('/:id/documentos', upload.single('file'), controller.subirDocumento);
router.get('/:id/documentos', controller.listarDocumentos);
router.get('/:id/documentos/:docId/download', controller.descargarDocumento);
router.get('/:id/documentos/:docId', controller.descargarDocumento);
router.delete('/:id/documentos/:docId', controller.eliminarDocumento);

module.exports = router;
