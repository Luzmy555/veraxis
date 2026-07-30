const pool = require('../db');

// Filtra qué queda accesible por URL directa bajo /uploads. Las fotos de perfil del
// cliente son públicas a propósito (se usan en <img src> sin headers); todo lo demás
// (cédulas, contratos, comprobantes de gastos, certificados) ya tiene su propio
// endpoint autenticado en el controlador correspondiente, así que aquí se bloquea
// el acceso directo por nombre de archivo adivinado.
module.exports = async function uploadsAccess(req, res, next) {
  const partes = req.path.split('/').filter(Boolean); // ej: ['clientes', '5', 'foto.jpg']

  if (partes[0] === 'config') return next();

  if (partes[0] === 'clientes' && partes.length === 3) {
    const [, clienteId, filename] = partes;
    try {
      const result = await pool.query('SELECT foto FROM clientes WHERE id = $1', [clienteId]);
      if (result.rowCount > 0 && result.rows[0].foto && result.rows[0].foto === filename) {
        return next();
      }
    } catch (error) {
      console.error('Error verificando acceso a archivo de cliente:', error);
    }
    return res.status(403).json({ error: 'Acceso no autorizado. Usa el endpoint autenticado de descarga de documentos.' });
  }

  return res.status(403).json({ error: 'Acceso no autorizado a este archivo.' });
};
