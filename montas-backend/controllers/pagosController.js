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
  const { cliente_id, fecha, concepto, monto, estado, metodo_pago, observacion } = req.body;

  try {
    if (!cliente_id || !fecha || !concepto) {
      return res.status(400).json({ error: 'Cliente, fecha y concepto son requeridos.' });
    }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número mayor a 0.' });
    }

    // Verificar si el cliente existe
    const cliente = await pool.query(
      'SELECT id FROM clientes WHERE id = $1',
      [cliente_id]
    );

    if (cliente.rowCount === 0) {
      return res.status(400).json({ error: 'Cliente no encontrado' });
    }

    const registradoPor = req.user ? req.user.id : null;
    const registradoPorNombre = req.user ? req.user.usuario : null;

    const result = await pool.query(
      `INSERT INTO pagos (cliente_id, fecha, concepto, monto, estado, metodo_pago, observacion, registrado_por, registrado_por_nombre)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [cliente_id, fecha, concepto, montoNum, estado, metodo_pago || 'Efectivo', observacion || null, registradoPor, registradoPorNombre]
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

// Devuelve el número de factura de este pago; si todavía no tiene uno, lo asigna
// consumiendo el contador de configuracion.factura_numero_actual (una sola vez, queda fijo).
exports.obtenerNumeroFactura = async (req, res) => {
  const { id } = req.params;
  try {
    const pago = await pool.query('SELECT id, factura_numero FROM pagos WHERE id = $1', [id]);
    if (pago.rowCount === 0) return res.status(404).json({ error: 'Pago no encontrado' });

    if (pago.rows[0].factura_numero) {
      return res.json({ numero: pago.rows[0].factura_numero });
    }

    const config = await pool.query(
      `UPDATE configuracion SET factura_numero_actual = factura_numero_actual + 1
       WHERE id = 1 RETURNING factura_prefijo, factura_numero_actual`
    );
    const { factura_prefijo, factura_numero_actual } = config.rows[0];
    const numero = `${factura_prefijo || 'MON'}-${String(factura_numero_actual).padStart(6, '0')}`;

    await pool.query('UPDATE pagos SET factura_numero = $1 WHERE id = $2', [numero, id]);
    res.json({ numero });
  } catch (error) {
    console.error('Error obteniendo número de factura:', error);
    res.status(500).json({ error: 'No se pudo obtener el número de factura.' });
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
