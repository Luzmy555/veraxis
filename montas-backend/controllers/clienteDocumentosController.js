const pool = require('../db');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'clientes');

const ensureClientFolder = (clienteId) => {
  const dir = path.join(UPLOADS_DIR, String(clienteId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

exports.subirDocumento = async (req, res) => {
  try {
    const clienteId = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const tipo = req.body.tipo || req.query.tipo || 'otro';
    const uploadedBy = req.user.id;
    const uploadedByRole = req.user.rol;

    // Validación de roles: solo administradores o instructores pueden subir
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(uploadedByRole)) {
      return res.status(403).json({ error: 'No autorizado para subir documentos' });
    }

    const filename = req.file.filename;
    const original_name = req.file.originalname;
    const mime = req.file.mimetype;

    const result = await pool.query(
      `INSERT INTO cliente_documentos (cliente_id, tipo, filename, original_name, mime, uploaded_by, uploaded_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [clienteId, tipo, filename, original_name, mime, uploadedBy, uploadedByRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error subiendo documento' });
  }
};

exports.listarDocumentos = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const result = await pool.query(
      `SELECT id, tipo, filename, original_name, mime, uploaded_by, uploaded_by_role, uploaded_at
       FROM cliente_documentos WHERE cliente_id = $1 ORDER BY uploaded_at DESC`,
      [clienteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando documentos' });
  }
};

exports.descargarDocumento = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const result = await pool.query('SELECT * FROM cliente_documentos WHERE id = $1 AND cliente_id = $2', [docId, id]);
    const doc = result.rows[0];
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const filePath = path.join(__dirname, '..', 'uploads', 'clientes', String(id), doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en servidor' });

    // determinamos disposition: inline para imágenes, attachment para otros
    const inline = (doc.mime || '').startsWith('image/');
    res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${doc.original_name || doc.filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error descargando documento' });
  }
};

exports.eliminarDocumento = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const result = await pool.query('SELECT * FROM cliente_documentos WHERE id = $1 AND cliente_id = $2', [docId, id]);
    const doc = result.rows[0];
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    const requesterRole = req.user.rol;
    // Solo administradores pueden eliminar documentos
    if (!['admin', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para eliminar documentos' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'clientes', String(id), doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM cliente_documentos WHERE id = $1', [docId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando documento' });
  }
};
