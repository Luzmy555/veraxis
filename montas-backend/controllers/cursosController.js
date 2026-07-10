const pool = require('../db');

exports.getCursos = async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM cursos ORDER BY nombre'
  );
  res.json(result.rows);
};

exports.getCursoPorId = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM cursos WHERE id = $1',
    [id]
  );
  res.json(result.rows[0]);
};

exports.crearCurso = async (req, res) => {
  const { nombre, descripcion, duracion_semanas, precio, activo } = req.body;
  const result = await pool.query(
    `INSERT INTO cursos (nombre, descripcion, duracion_semanas, precio, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      nombre,
      descripcion || null,
      duracion_semanas || null,
      parseFloat(precio) || 0,
      activo === false ? false : true
    ]
  );
  res.status(201).json(result.rows[0]);
};

exports.actualizarCurso = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, duracion_semanas, precio, activo } = req.body;
  const parsedPrecio = parseFloat(precio) || 0;
  const result = await pool.query(
    `UPDATE cursos
     SET nombre = $1,
         descripcion = $2,
         duracion_semanas = $3,
         precio = $4,
         activo = $5
     WHERE id = $6
     RETURNING *`,
    [
      nombre,
      descripcion || null,
      duracion_semanas || null,
      parsedPrecio,
      activo === false ? false : true,
      id
    ]
  );

  // Actualizar clientes asignados al curso para reflejar el precio y nombre del curso
  try {
    await pool.query(
      `UPDATE clientes
       SET precio_total = $1,
           curso_actual = $2
       WHERE curso_id = $3`,
      [parsedPrecio, nombre, id]
    );
  } catch (updateClientesError) {
    console.error('Error actualizando clientes del curso:', updateClientesError);
  }

  res.json(result.rows[0]);
};

exports.eliminarCurso = async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM cursos WHERE id = $1', [id]);
  res.status(204).send();
};

exports.getInstructoresDeCurso = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT i.id, i.nombre, i.telefono, i.correo, i.especialidad
     FROM instructores i
     INNER JOIN curso_instructor ci ON i.id = ci.instructor_id
     WHERE ci.curso_id = $1
     ORDER BY i.nombre`,
    [id]
  );
  res.json(result.rows);
};

exports.asignarInstructoresCurso = async (req, res) => {
  const { id } = req.params;
  const { instructor_ids } = req.body;

  if (!Array.isArray(instructor_ids)) {
    return res.status(400).json({ error: 'instructor_ids debe ser un array' });
  }

  try {
    await pool.query('DELETE FROM curso_instructor WHERE curso_id = $1', [id]);

    for (const instructor_id of instructor_ids) {
      await pool.query(
        'INSERT INTO curso_instructor (curso_id, instructor_id) VALUES ($1, $2)',
        [id, instructor_id]
      );
    }

    res.json({ success: true, mensaje: 'Instructores asignados correctamente' });
  } catch (error) {
    console.error('Error asignando instructores:', error);
    res.status(500).json({ error: 'Error asignando instructores' });
  }
};

exports.getCursosDelInstructor = async (req, res) => {
  const { instructor_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.duracion_semanas, c.precio, c.activo, c.created_at
       FROM cursos c
       INNER JOIN curso_instructor ci ON c.id = ci.curso_id
       WHERE ci.instructor_id = $1 AND c.activo = true
       ORDER BY c.nombre`,
      [instructor_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo cursos del instructor:', error);
    res.status(500).json({ error: 'Error obteniendo cursos' });
  }
};
  

