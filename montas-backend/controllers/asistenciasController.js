const pool = require('../db');

exports.obtenerAsistencias = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM asistencias ORDER BY fecha, numero_clase');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obtenerAsistencias:', error);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
};

exports.obtenerAsistenciasPorCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM asistencias WHERE cliente_id=$1 ORDER BY fecha, numero_clase',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obtenerAsistenciasPorCliente:', error);
    res.status(500).json({ error: 'Error al obtener asistencias del cliente' });
  }
};

exports.crearAsistencia = async (req, res) => {
  try {
    const { cliente_id, fecha, hora, estado, numero } = req.body;

    if (!cliente_id || !fecha || !hora || !estado) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    let estadoNormalized = estado;
    if (typeof estadoNormalized === 'string') {
      const lower = estadoNormalized.toLowerCase();
      if (lower === 'asistió' || lower === 'asistio' || lower === 'presente') {
        estadoNormalized = 'presente';
      } else if (lower === 'no asistió' || lower === 'no asistio' || lower === 'excusa' || lower === 'ausente') {
        estadoNormalized = 'ausente';
      }
    }

    if (!['presente', 'ausente'].includes(estadoNormalized)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Verificar que el cliente exista
    const clienteRes = await pool.query('SELECT id FROM clientes WHERE id=$1', [cliente_id]);
    if (clienteRes.rowCount === 0) {
      return res.status(400).json({ error: 'Cliente no existe' });
    }

    const result = await pool.query(`
      INSERT INTO asistencias (cliente_id, fecha, hora, estado, numero_clase)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [cliente_id, fecha, hora, estadoNormalized, numero]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error crearAsistencia:', error);

    if (error.code === '23503') { // foreign key violation
      return res.status(400).json({ error: 'Violación de clave foránea: cliente no existe' });
    }

    res.status(500).json({ error: 'Error al crear asistencia' });
  }
};
