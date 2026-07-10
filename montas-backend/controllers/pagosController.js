const pool = require('../db');

// Obtener todos los pagos
exports.obtenerTodosLosPagos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pagos ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo pagos' });
  }
};

// Obtener pagos por cliente
exports.obtenerPagosPorCliente = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM pagos WHERE cliente_id = $1 ORDER BY fecha DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo pagos del cliente' });
  }
};

// Registrar nuevo pago
exports.registrarPago = async (req, res) => {
  const { cliente_id, fecha, concepto, monto, estado } = req.body;

  try {
    // Verificar si el cliente existe
    const cliente = await pool.query(
      'SELECT id FROM clientes WHERE id = $1',
      [cliente_id]
    );

    if (cliente.rowCount === 0) {
      return res.status(400).json({ error: 'Cliente no encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO pagos (cliente_id, fecha, concepto, monto, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cliente_id, fecha, concepto, monto, estado]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registrando pago' });
  }
};

// Eliminar pago
exports.eliminarPago = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM pagos WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error eliminando pago' });
  }
};

// Filtrar pagos por estado
exports.filtrarPagosPorEstado = async (req, res) => {
  const { estado } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM pagos WHERE estado = $1',
      [estado]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error filtrando pagos' });
  }
};
