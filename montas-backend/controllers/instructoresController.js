const pool = require('../db');
const { resolverFiltroSucursal } = require('../utils/sucursal');

exports.getInstructores = async (req, res) => {
  const sucursalId = resolverFiltroSucursal(req);
  const where = sucursalId ? 'WHERE i.sucursal_id = $1' : '';
  const params = sucursalId ? [sucursalId] : [];
  const result = await pool.query(
    `SELECT i.*, u.usuario AS usuario_vinculado
     FROM instructores i
     LEFT JOIN usuarios u ON u.id = i.usuario_id
     ${where}
     ORDER BY i.nombre`,
    params
  );
  res.json(result.rows);
};

exports.getInstructorPorId = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT i.*, u.usuario AS usuario_vinculado
     FROM instructores i
     LEFT JOIN usuarios u ON u.id = i.usuario_id
     WHERE i.id = $1`,
    [id]
  );
  res.json(result.rows[0]);
};

// Resuelve el perfil de instructor del usuario que está logueado (según su token)
exports.getMiPerfilInstructor = async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM instructores WHERE usuario_id = $1',
    [req.user.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Tu cuenta todavía no está vinculada a ningún perfil de instructor. Pídele a un administrador que te vincule desde Instructores.' });
  }
  res.json(result.rows[0]);
};

exports.crearInstructor = async (req, res) => {
  const { nombre, telefono, correo, especialidad, activo, usuario_id, sucursal_id } = req.body;
  const result = await pool.query(
    `INSERT INTO instructores (nombre, telefono, correo, especialidad, activo, usuario_id, sucursal_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      nombre,
      telefono || null,
      correo || null,
      especialidad || null,
      activo === false ? false : true,
      usuario_id || null,
      sucursal_id || resolverFiltroSucursal(req) || null
    ]
  );
  res.status(201).json(result.rows[0]);
};

exports.actualizarInstructor = async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, correo, especialidad, activo, usuario_id, sucursal_id } = req.body;
  const actual = await pool.query('SELECT sucursal_id FROM instructores WHERE id = $1', [id]);
  const result = await pool.query(
    `UPDATE instructores
     SET nombre = $1,
         telefono = $2,
         correo = $3,
         especialidad = $4,
         activo = $5,
         usuario_id = $6,
         sucursal_id = $7
     WHERE id = $8
     RETURNING *`,
    [
      nombre,
      telefono || null,
      correo || null,
      especialidad || null,
      activo === false ? false : true,
      usuario_id || null,
      sucursal_id || actual.rows[0]?.sucursal_id || null,
      id
    ]
  );
  res.json(result.rows[0]);
};

exports.eliminarInstructor = async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM instructores WHERE id = $1', [id]);
  res.status(204).send();
};
