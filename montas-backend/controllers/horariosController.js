const pool = require('../db');

// Resuelve el horario propio del estudiante logueado (nunca confiar en un cliente_id de la URL).
exports.getMisHorarios = async (req, res) => {
  try {
    const miCliente = await pool.query('SELECT id FROM clientes WHERE usuario_id = $1', [req.user.id]);
    if (miCliente.rowCount === 0) {
      return res.status(404).json({ error: 'Tu cuenta todavía no está vinculada a ningún expediente.' });
    }
    const result = await pool.query(
      `SELECT h.*, c.nombre AS nombre_cliente
       FROM horarios h
       LEFT JOIN clientes c ON c.id = h.cliente_id
       WHERE h.cliente_id = $1
       ORDER BY h.created_at ASC`,
      [miCliente.rows[0].id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo mi horario:', error);
    res.status(500).json({ error: 'No se pudo obtener tu horario.' });
  }
};

// Obtener todos los horarios (opcionalmente filtrados por instructor y/o día)
exports.obtenerHorarios = async (req, res) => {
  try {
    const { instructor_id, dia } = req.query;
    const conditions = [];
    const params = [];

    if (instructor_id) {
      params.push(instructor_id);
      conditions.push(`c.instructor_id = $${params.length}`);
    }
    if (dia) {
      params.push(dia);
      conditions.push(`h.dia = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT h.*, c.nombre AS nombre_cliente
       FROM horarios h
       LEFT JOIN clientes c ON c.id = h.cliente_id
       ${where}
       ORDER BY h.created_at ASC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo horarios' });
  }
};

// Crear nuevo horario
exports.crearHorario = async (req, res) => {
  const { cliente_id, dia, hora, numero_clase, repetir } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO horarios 
       (cliente_id, dia, hora, numero_clase, repetir)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [cliente_id, dia, hora, numero_clase, repetir]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando horario' });
  }
};

// Eliminar horario
exports.eliminarHorario = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM horarios WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando horario' });
  }
};

// Marcar clase como hecha
exports.marcarClaseComoHecha = async (req, res) => {
  const { id } = req.params;

  try {
    const actual = await pool.query(
      'SELECT numero_clase FROM horarios WHERE id = $1',
      [id]
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const nuevoNumero = actual.rows[0].numero_clase + 1;

    const result = await pool.query(
      'UPDATE horarios SET numero_clase = $1 WHERE id = $2 RETURNING *',
      [nuevoNumero, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando horario' });
  }
};
