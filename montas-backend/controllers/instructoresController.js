const pool = require('../db');

exports.getInstructores = async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM instructores ORDER BY nombre'
  );
  res.json(result.rows);
};

exports.getInstructorPorId = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM instructores WHERE id = $1',
    [id]
  );
  res.json(result.rows[0]);
};

exports.crearInstructor = async (req, res) => {
  const { nombre, telefono, correo, especialidad, activo } = req.body;
  const result = await pool.query(
    `INSERT INTO instructores (nombre, telefono, correo, especialidad, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      nombre,
      telefono || null,
      correo || null,
      especialidad || null,
      activo === false ? false : true
    ]
  );
  res.status(201).json(result.rows[0]);
};

exports.actualizarInstructor = async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, correo, especialidad, activo } = req.body;
  const result = await pool.query(
    `UPDATE instructores
     SET nombre = $1,
         telefono = $2,
         correo = $3,
         especialidad = $4,
         activo = $5
     WHERE id = $6
     RETURNING *`,
    [
      nombre,
      telefono || null,
      correo || null,
      especialidad || null,
      activo === false ? false : true,
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
