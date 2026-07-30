const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { registrarAuditoria } = require('./auditoriaController');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'config');

// Público: la página de inicio la usa para armar la galería (también vive dentro
// de la respuesta de GET /api/configuracion/portada, esta ruta queda para manejarla aparte).
exports.listarGaleria = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, tipo, archivo, orden FROM landing_galeria ORDER BY orden, id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando galería:', error);
    res.status(500).json({ error: 'No se pudo cargar la galería.' });
  }
};

exports.crearItemGaleria = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    const tipo = (req.file.mimetype || '').startsWith('video/') ? 'video' : 'imagen';

    const result = await pool.query(
      `INSERT INTO landing_galeria (tipo, archivo, orden)
       VALUES ($1, $2, (SELECT COALESCE(MAX(orden), 0) + 1 FROM landing_galeria))
       RETURNING *`,
      [tipo, req.file.filename]
    );

    await registrarAuditoria(req, 'Agregó un ítem a la galería de inicio', req.file.originalname);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando ítem de galería:', error);
    res.status(500).json({ error: 'No se pudo guardar el archivo.' });
  }
};

// Intercambia el "orden" de este ítem con el de su vecino inmediato (anterior o
// siguiente en la lista ya ordenada) — mover arriba/abajo de a uno por clic.
exports.moverItemGaleria = async (req, res) => {
  try {
    const { id } = req.params;
    const { direccion } = req.body;
    if (!['arriba', 'abajo'].includes(direccion)) {
      return res.status(400).json({ error: 'Dirección inválida.' });
    }

    const todos = await pool.query('SELECT id, orden FROM landing_galeria ORDER BY orden, id');
    const idx = todos.rows.findIndex(r => r.id === parseInt(id, 10));
    if (idx === -1) return res.status(404).json({ error: 'Ítem no encontrado' });

    const vecinoIdx = direccion === 'arriba' ? idx - 1 : idx + 1;
    if (vecinoIdx < 0 || vecinoIdx >= todos.rows.length) {
      return res.status(400).json({ error: 'El ítem ya está en ese extremo de la lista.' });
    }

    const actual = todos.rows[idx];
    const vecino = todos.rows[vecinoIdx];
    await pool.query('UPDATE landing_galeria SET orden = $1 WHERE id = $2', [vecino.orden, actual.id]);
    await pool.query('UPDATE landing_galeria SET orden = $1 WHERE id = $2', [actual.orden, vecino.id]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Error moviendo ítem de galería:', error);
    res.status(500).json({ error: 'No se pudo reordenar la galería.' });
  }
};

exports.eliminarItemGaleria = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await pool.query('DELETE FROM landing_galeria WHERE id = $1 RETURNING archivo', [id]);
    if (item.rowCount === 0) return res.status(404).json({ error: 'Ítem no encontrado' });

    const filePath = path.join(UPLOADS_DIR, item.rows[0].archivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando ítem de galería:', error);
    res.status(500).json({ error: 'No se pudo eliminar el ítem.' });
  }
};
