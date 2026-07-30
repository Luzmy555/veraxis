const pool = require('../db');

// Registra una acción administrativa. Nunca debe tumbar la operación principal si falla.
exports.registrarAuditoria = async (req, accion, detalle) => {
  try {
    await pool.query(
      'INSERT INTO auditoria_log (usuario_id, usuario_nombre, accion, detalle) VALUES ($1,$2,$3,$4)',
      [req.user ? req.user.id : null, req.user ? req.user.usuario : null, accion, detalle || null]
    );
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
};

exports.listarAuditoria = async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const result = await pool.query('SELECT * FROM auditoria_log ORDER BY fecha DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando auditoría:', error);
    res.status(500).json({ error: 'No se pudo cargar el historial de actividad.' });
  }
};
