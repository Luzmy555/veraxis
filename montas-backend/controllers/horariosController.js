const pool = require('../db');

// Obtener todos los horarios
exports.obtenerHorarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, c.nombre AS nombre_cliente
       FROM horarios h
       LEFT JOIN clientes c ON c.id = h.cliente_id
       ORDER BY h.created_at ASC`
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
