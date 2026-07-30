const pool = require('../db');

const STAFF_ROLES = ['admin', 'administrador', 'instructor', 'usuario'];

// Deja pasar al staff de siempre; si el rol es 'estudiante', solo deja ver su propio
// expediente (resuelto vía clientes.usuario_id, nunca confiando en el id de la URL).
function requireOwnClienteOrStaff(paramName = 'id') {
  return async (req, res, next) => {
    const rol = (req.user && req.user.rol) || '';
    if (STAFF_ROLES.includes(rol)) return next();
    if (rol !== 'estudiante') {
      return res.status(403).json({ error: 'Acceso no autorizado.' });
    }

    try {
      const result = await pool.query('SELECT id FROM clientes WHERE usuario_id = $1', [req.user.id]);
      const miClienteId = result.rows[0]?.id;
      if (miClienteId && String(miClienteId) === String(req.params[paramName])) {
        return next();
      }
      return res.status(403).json({ error: 'Acceso no autorizado.' });
    } catch (error) {
      console.error('Error verificando acceso de estudiante:', error);
      res.status(500).json({ error: 'Error verificando acceso.' });
    }
  };
}

module.exports = { requireOwnClienteOrStaff };
