const pool = require('../db');
const { registrarAuditoria } = require('./auditoriaController');
const { resolverFiltroSucursal } = require('../utils/sucursal');

// pagos no tiene su propia columna sucursal_id (hereda la sede del cliente que pagó);
// gastos sí la tiene directamente. $2 puede ser null: en ese caso no filtra por sede
// (vista combinada, solo la usan reportes/movimientos, nunca abrir/cerrar caja).
async function calcularMovimientosDelDia(fecha, sucursalId) {
  const ingresos = await pool.query(
    `SELECT
       COALESCE(SUM(p.monto) FILTER (WHERE COALESCE(p.metodo_pago, 'Efectivo') = 'Efectivo'), 0) AS efectivo,
       COALESCE(SUM(p.monto) FILTER (WHERE COALESCE(p.metodo_pago, 'Efectivo') <> 'Efectivo'), 0) AS otros,
       COUNT(*) AS cantidad
     FROM pagos p
     LEFT JOIN clientes c ON c.id = p.cliente_id
     WHERE p.fecha = $1 AND ($2::int IS NULL OR c.sucursal_id = $2)`,
    [fecha, sucursalId]
  );
  const gastos = await pool.query(
    `SELECT
       COALESCE(SUM(monto) FILTER (WHERE metodo_pago = 'Efectivo'), 0) AS efectivo,
       COALESCE(SUM(monto) FILTER (WHERE metodo_pago <> 'Efectivo'), 0) AS otros,
       COUNT(*) AS cantidad
     FROM gastos WHERE fecha = $1 AND ($2::int IS NULL OR sucursal_id = $2)`,
    [fecha, sucursalId]
  );
  return {
    ingresos_efectivo: parseFloat(ingresos.rows[0].efectivo),
    ingresos_otros: parseFloat(ingresos.rows[0].otros),
    ingresos_cantidad: parseInt(ingresos.rows[0].cantidad, 10),
    gastos_efectivo: parseFloat(gastos.rows[0].efectivo),
    gastos_otros: parseFloat(gastos.rows[0].otros),
    gastos_cantidad: parseInt(gastos.rows[0].cantidad, 10)
  };
}

// Caja es una caja registradora física por sede: a diferencia de reportes/movimientos
// (que sí pueden ver todas las sedes combinadas), abrir/cerrar/ver el estado del día
// siempre necesita una sede concreta.
function requerirSucursal(req, res) {
  const sucursalId = resolverFiltroSucursal(req);
  if (!sucursalId) {
    res.status(400).json({ error: 'Debes especificar una sede (?sucursal_id=) para operar la caja.' });
    return null;
  }
  return sucursalId;
}

// ===== APERTURA =====

exports.getAperturaDia = async (req, res) => {
  try {
    const sucursalId = requerirSucursal(req, res);
    if (!sucursalId) return;
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const result = await pool.query('SELECT * FROM caja_aperturas WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    if (result.rowCount === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo apertura de caja:', error);
    res.status(500).json({ error: 'No se pudo obtener la apertura de caja.' });
  }
};

exports.abrirCaja = async (req, res) => {
  try {
    const sucursalId = requerirSucursal(req, res);
    if (!sucursalId) return;
    const { fecha, monto_apertura, notas } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida.' });
    const monto = parseFloat(monto_apertura);
    if (isNaN(monto) || monto < 0) return res.status(400).json({ error: 'El monto de apertura no es válido.' });

    const yaAbierta = await pool.query('SELECT id FROM caja_aperturas WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    if (yaAbierta.rowCount > 0) {
      return res.status(409).json({ error: `La caja del ${fecha} ya fue abierta en esta sede.` });
    }
    const yaCerrada = await pool.query('SELECT id FROM caja_cierres WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    if (yaCerrada.rowCount > 0) {
      return res.status(409).json({ error: `La caja del ${fecha} ya está cerrada en esta sede, no se puede volver a abrir.` });
    }

    const result = await pool.query(
      `INSERT INTO caja_aperturas (fecha, monto_apertura, abierto_por, abierto_por_nombre, notas, sucursal_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [fecha, monto, req.user.id, req.user.usuario, notas || null, sucursalId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error abriendo caja:', error);
    res.status(500).json({ error: 'No se pudo abrir la caja.' });
  }
};

exports.eliminarApertura = async (req, res) => {
  try {
    const { id } = req.params;
    const apertura = await pool.query('SELECT fecha, sucursal_id FROM caja_aperturas WHERE id = $1', [id]);
    if (apertura.rowCount === 0) return res.status(404).json({ error: 'Apertura no encontrada' });

    const yaCerrada = await pool.query(
      'SELECT id FROM caja_cierres WHERE fecha = $1 AND sucursal_id = $2',
      [apertura.rows[0].fecha, apertura.rows[0].sucursal_id]
    );
    if (yaCerrada.rowCount > 0) {
      return res.status(409).json({ error: 'No se puede eliminar la apertura de un día que ya está cerrado.' });
    }

    await pool.query('DELETE FROM caja_aperturas WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando apertura de caja:', error);
    res.status(500).json({ error: 'No se pudo eliminar la apertura.' });
  }
};

// ===== RESUMEN (dashboard del día) =====

exports.getResumenDia = async (req, res) => {
  try {
    const sucursalId = requerirSucursal(req, res);
    if (!sucursalId) return;
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);

    const cierre = await pool.query('SELECT * FROM caja_cierres WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    if (cierre.rowCount > 0) {
      return res.json({ fecha, estado: 'cerrada', cierre: cierre.rows[0] });
    }

    const apertura = await pool.query('SELECT * FROM caja_aperturas WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    const movimientos = await calcularMovimientosDelDia(fecha, sucursalId);

    if (apertura.rowCount === 0) {
      // Todavía no se abrió la caja de este día: sugerimos el saldo con el que debería abrir.
      const ultimoCierre = await pool.query(
        'SELECT monto_contado FROM caja_cierres WHERE fecha < $1 AND sucursal_id = $2 ORDER BY fecha DESC LIMIT 1',
        [fecha, sucursalId]
      );
      const aperturaSugerida = ultimoCierre.rowCount > 0 ? parseFloat(ultimoCierre.rows[0].monto_contado) : 0;
      return res.json({
        fecha,
        estado: 'sin_abrir',
        apertura_sugerida: aperturaSugerida,
        ...movimientos
      });
    }

    const montoApertura = parseFloat(apertura.rows[0].monto_apertura);
    const balanceActual = montoApertura + movimientos.ingresos_efectivo - movimientos.gastos_efectivo;

    res.json({
      fecha,
      estado: 'abierta',
      apertura: apertura.rows[0],
      balance_actual: balanceActual,
      ...movimientos
    });
  } catch (error) {
    console.error('Error calculando resumen de caja:', error);
    res.status(500).json({ error: 'No se pudo calcular el resumen de caja.' });
  }
};

// ===== CIERRE =====

exports.listarCierres = async (req, res) => {
  try {
    const sucursalId = resolverFiltroSucursal(req);
    const where = sucursalId ? 'WHERE cc.sucursal_id = $1' : '';
    const params = sucursalId ? [sucursalId] : [];
    const result = await pool.query(
      `SELECT cc.*, s.nombre AS sucursal_nombre
       FROM caja_cierres cc LEFT JOIN sucursales s ON s.id = cc.sucursal_id
       ${where} ORDER BY cc.fecha DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando cierres de caja:', error);
    res.status(500).json({ error: 'No se pudieron cargar los cierres de caja.' });
  }
};

exports.cerrarCaja = async (req, res) => {
  try {
    const sucursalId = requerirSucursal(req, res);
    if (!sucursalId) return;
    const { fecha, monto_contado, notas } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida.' });
    const contado = parseFloat(monto_contado);
    if (isNaN(contado) || contado < 0) return res.status(400).json({ error: 'El monto contado no es válido.' });

    const yaExiste = await pool.query('SELECT id FROM caja_cierres WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    if (yaExiste.rowCount > 0) {
      return res.status(409).json({ error: `La caja del ${fecha} ya fue cerrada en esta sede. Un cierre no se puede editar; si fue un error, elimínalo (solo admin) y vuelve a cerrarlo.` });
    }

    // La apertura real (si la caja se abrió formalmente) manda sobre cualquier valor manual.
    const aperturaRow = await pool.query('SELECT monto_apertura FROM caja_aperturas WHERE fecha = $1 AND sucursal_id = $2', [fecha, sucursalId]);
    let apertura = aperturaRow.rowCount > 0 ? parseFloat(aperturaRow.rows[0].monto_apertura) : parseFloat(req.body.monto_apertura);
    if (isNaN(apertura) || apertura < 0) return res.status(400).json({ error: 'El monto de apertura no es válido. Abre la caja primero.' });

    const movimientos = await calcularMovimientosDelDia(fecha, sucursalId);
    const montoEsperado = apertura + movimientos.ingresos_efectivo - movimientos.gastos_efectivo;
    const diferencia = contado - montoEsperado;

    const result = await pool.query(
      `INSERT INTO caja_cierres
        (fecha, monto_apertura, ingresos_efectivo, ingresos_otros, gastos_efectivo, monto_esperado, monto_contado, diferencia, notas, cerrado_por, cerrado_por_nombre, sucursal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        fecha, apertura, movimientos.ingresos_efectivo, movimientos.ingresos_otros, movimientos.gastos_efectivo,
        montoEsperado, contado, diferencia, notas || null,
        req.user.id, req.user.usuario, sucursalId
      ]
    );
    await registrarAuditoria(req, 'Cerró caja', `${fecha} · diferencia ${diferencia.toFixed(2)}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error cerrando caja:', error);
    res.status(500).json({ error: 'No se pudo cerrar la caja.' });
  }
};

exports.eliminarCierre = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM caja_cierres WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cierre no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando cierre de caja:', error);
    res.status(500).json({ error: 'No se pudo eliminar el cierre.' });
  }
};

// ===== MOVIMIENTOS (ingresos + egresos unificados, sin duplicar datos) =====

exports.getMovimientos = async (req, res) => {
  try {
    const { desde, hasta, tipo, busqueda } = req.query;
    const sucursalId = resolverFiltroSucursal(req);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const base = `
      SELECT p.id, p.fecha, 'Ingreso' AS tipo, p.concepto AS concepto,
             COALESCE(c.nombre, 'Cliente eliminado') AS referencia,
             p.metodo_pago, p.monto, p.registrado_por_nombre AS usuario, 'pago' AS origen,
             c.sucursal_id AS sucursal_id
      FROM pagos p LEFT JOIN clientes c ON c.id = p.cliente_id
      UNION ALL
      SELECT g.id, g.fecha, 'Egreso' AS tipo, g.categoria AS concepto,
             COALESCE(g.proveedor, '—') AS referencia,
             g.metodo_pago, g.monto, g.registrado_por_nombre AS usuario, 'gasto' AS origen,
             g.sucursal_id AS sucursal_id
      FROM gastos g
    `;

    const conditions = [];
    const params = [];
    if (desde) { params.push(desde); conditions.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); conditions.push(`fecha <= $${params.length}`); }
    if (tipo && ['Ingreso', 'Egreso'].includes(tipo)) { params.push(tipo); conditions.push(`tipo = $${params.length}`); }
    if (sucursalId) { params.push(sucursalId); conditions.push(`sucursal_id = $${params.length}`); }
    if (busqueda) {
      params.push(`%${busqueda}%`);
      conditions.push(`(concepto ILIKE $${params.length} OR referencia ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalResult = await pool.query(`SELECT COUNT(*) FROM (${base}) t ${where}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataParams = [...params, pageSize, offset];
    const result = await pool.query(
      `SELECT * FROM (${base}) t ${where} ORDER BY fecha DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    );

    res.json({ movimientos: result.rows, total, page, pageSize, totalPaginas: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (error) {
    console.error('Error listando movimientos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los movimientos.' });
  }
};

// ===== REPORTES =====

exports.getReportes = async (req, res) => {
  try {
    const desde = req.query.desde || new Date().toISOString().slice(0, 8) + '01';
    const hasta = req.query.hasta || new Date().toISOString().slice(0, 10);
    const sucursalId = resolverFiltroSucursal(req);

    const totales = await pool.query(
      `SELECT
         (SELECT COALESCE(SUM(p.monto),0) FROM pagos p JOIN clientes c ON c.id = p.cliente_id
           WHERE p.fecha BETWEEN $1 AND $2 AND ($3::int IS NULL OR c.sucursal_id = $3)) AS ingresos,
         (SELECT COALESCE(SUM(monto),0) FROM gastos
           WHERE fecha BETWEEN $1 AND $2 AND ($3::int IS NULL OR sucursal_id = $3)) AS egresos`,
      [desde, hasta, sucursalId]
    );

    const porMetodoPago = await pool.query(
      `SELECT metodo_pago,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'ingreso'), 0) AS ingresos,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'egreso'), 0) AS egresos
       FROM (
         SELECT p.metodo_pago, p.monto, 'ingreso' AS origen, c.sucursal_id
         FROM pagos p JOIN clientes c ON c.id = p.cliente_id
         WHERE p.fecha BETWEEN $1 AND $2
         UNION ALL
         SELECT metodo_pago, monto, 'egreso' AS origen, sucursal_id FROM gastos WHERE fecha BETWEEN $1 AND $2
       ) t
       WHERE ($3::int IS NULL OR sucursal_id = $3)
       GROUP BY metodo_pago ORDER BY metodo_pago`,
      [desde, hasta, sucursalId]
    );

    const porCategoria = await pool.query(
      `SELECT categoria, COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
       FROM gastos WHERE fecha BETWEEN $1 AND $2 AND ($3::int IS NULL OR sucursal_id = $3)
       GROUP BY categoria ORDER BY total DESC`,
      [desde, hasta, sucursalId]
    );

    const porDia = await pool.query(
      `SELECT fecha,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'ingreso'), 0) AS ingresos,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'egreso'), 0) AS egresos
       FROM (
         SELECT p.fecha, p.monto, 'ingreso' AS origen, c.sucursal_id
         FROM pagos p JOIN clientes c ON c.id = p.cliente_id
         WHERE p.fecha BETWEEN $1 AND $2
         UNION ALL
         SELECT fecha, monto, 'egreso' AS origen, sucursal_id FROM gastos WHERE fecha BETWEEN $1 AND $2
       ) t
       WHERE ($3::int IS NULL OR sucursal_id = $3)
       GROUP BY fecha ORDER BY fecha ASC`,
      [desde, hasta, sucursalId]
    );

    res.json({
      desde, hasta,
      totales: {
        ingresos: parseFloat(totales.rows[0].ingresos),
        egresos: parseFloat(totales.rows[0].egresos),
        balance: parseFloat(totales.rows[0].ingresos) - parseFloat(totales.rows[0].egresos)
      },
      porMetodoPago: porMetodoPago.rows.map(r => ({ metodo_pago: r.metodo_pago, ingresos: parseFloat(r.ingresos), egresos: parseFloat(r.egresos) })),
      porCategoria: porCategoria.rows.map(r => ({ categoria: r.categoria, total: parseFloat(r.total), cantidad: parseInt(r.cantidad, 10) })),
      porDia: porDia.rows.map(r => ({ fecha: r.fecha, ingresos: parseFloat(r.ingresos), egresos: parseFloat(r.egresos) }))
    });
  } catch (error) {
    console.error('Error generando reportes de caja:', error);
    res.status(500).json({ error: 'No se pudo generar el reporte.' });
  }
};
