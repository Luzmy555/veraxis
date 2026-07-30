const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { resolverFiltroSucursal } = require('../utils/sucursal');

const METODOS_VALIDOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'];
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'gastos');

async function validarGasto(body) {
  const { fecha, categoria, monto, itbis, metodo_pago } = body;
  if (!fecha) return 'La fecha es requerida.';
  if (!categoria) return 'La categoría es requerida.';
  const categoriaValida = await pool.query('SELECT id FROM categorias_gastos WHERE nombre = $1 AND activo = TRUE', [categoria]);
  if (categoriaValida.rowCount === 0) return 'Categoría inválida o inactiva.';
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) return 'El monto debe ser un número mayor a 0.';
  if (itbis !== undefined && itbis !== null && itbis !== '') {
    const itbisNum = parseFloat(itbis);
    if (isNaN(itbisNum) || itbisNum < 0) return 'El ITBIS no puede ser negativo.';
    if (itbisNum > montoNum) return 'El ITBIS no puede ser mayor que el monto total.';
  }
  if (metodo_pago && !METODOS_VALIDOS.includes(metodo_pago)) return 'Método de pago inválido.';
  return null;
}

exports.listarCategorias = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias_gastos WHERE activo = TRUE ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ error: 'No se pudieron cargar las categorías.' });
  }
};

exports.crearCategoria = async (req, res) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
    const result = await pool.query(
      'INSERT INTO categorias_gastos (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET activo = TRUE RETURNING *',
      [nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ error: 'No se pudo crear la categoría.' });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    // Desactivar en vez de borrar: no queremos perder la categoría de gastos históricos ya registrados.
    const result = await pool.query('UPDATE categorias_gastos SET activo = FALSE WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'No se pudo eliminar la categoría.' });
  }
};

exports.listarGastos = async (req, res) => {
  try {
    const { desde, hasta, categoria } = req.query;
    const sucursalId = resolverFiltroSucursal(req);
    const conditions = [];
    const params = [];
    if (desde) { params.push(desde); conditions.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); conditions.push(`fecha <= $${params.length}`); }
    if (categoria) { params.push(categoria); conditions.push(`categoria = $${params.length}`); }
    if (sucursalId) { params.push(sucursalId); conditions.push(`sucursal_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM gastos ${where} ORDER BY fecha DESC, id DESC`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando gastos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los gastos.' });
  }
};

exports.crearGasto = async (req, res) => {
  try {
    const errorValidacion = await validarGasto(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const { fecha, categoria, descripcion, monto, itbis, proveedor, rnc_proveedor, ncf, metodo_pago, sucursal_id } = req.body;
    const registradoPor = req.user.id;
    const registradoPorNombre = req.user.usuario;

    const comprobante = req.file ? req.file.filename : null;
    const comprobanteOriginalName = req.file ? req.file.originalname : null;
    const comprobanteMime = req.file ? req.file.mimetype : null;

    const result = await pool.query(
      `INSERT INTO gastos
        (fecha, categoria, descripcion, monto, itbis, proveedor, rnc_proveedor, ncf, metodo_pago, comprobante, comprobante_original_name, comprobante_mime, registrado_por, registrado_por_nombre, sucursal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        fecha, categoria, descripcion || null, parseFloat(monto), parseFloat(itbis) || 0,
        proveedor || null, rnc_proveedor || null, ncf || null, metodo_pago || 'Efectivo',
        comprobante, comprobanteOriginalName, comprobanteMime,
        registradoPor, registradoPorNombre,
        sucursal_id || resolverFiltroSucursal(req) || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando gasto:', error);
    res.status(500).json({ error: 'No se pudo registrar el gasto.' });
  }
};

exports.actualizarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const errorValidacion = await validarGasto(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const { fecha, categoria, descripcion, monto, itbis, proveedor, rnc_proveedor, ncf, metodo_pago } = req.body;
    const result = await pool.query(
      `UPDATE gastos SET
         fecha = $1, categoria = $2, descripcion = $3, monto = $4, itbis = $5,
         proveedor = $6, rnc_proveedor = $7, ncf = $8, metodo_pago = $9
       WHERE id = $10 RETURNING *`,
      [
        fecha, categoria, descripcion || null, parseFloat(monto), parseFloat(itbis) || 0,
        proveedor || null, rnc_proveedor || null, ncf || null, metodo_pago || 'Efectivo',
        id
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    res.status(500).json({ error: 'No se pudo actualizar el gasto.' });
  }
};

exports.eliminarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const actual = await pool.query('SELECT comprobante FROM gastos WHERE id = $1', [id]);
    if (actual.rowCount === 0) return res.status(404).json({ error: 'Gasto no encontrado' });

    if (actual.rows[0].comprobante) {
      const filePath = path.join(UPLOADS_DIR, actual.rows[0].comprobante);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM gastos WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    res.status(500).json({ error: 'No se pudo eliminar el gasto.' });
  }
};

exports.descargarComprobante = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM gastos WHERE id = $1', [id]);
    const gasto = result.rows[0];
    if (!gasto || !gasto.comprobante) return res.status(404).json({ error: 'Comprobante no encontrado' });

    const filePath = path.join(UPLOADS_DIR, gasto.comprobante);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en servidor' });

    const inline = (gasto.comprobante_mime || '').startsWith('image/') || gasto.comprobante_mime === 'application/pdf';
    res.setHeader('Content-Type', gasto.comprobante_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${gasto.comprobante_original_name || gasto.comprobante}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error descargando comprobante:', error);
    res.status(500).json({ error: 'Error descargando comprobante' });
  }
};

// CSV compatible con las columnas que pide el Formato 606 (Compras) de la DGII:
// RNC/Cédula, Tipo de NCF, NCF, Fecha, Monto facturado, ITBIS facturado
exports.exportarCsv = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const sucursalId = resolverFiltroSucursal(req);
    const conditions = [];
    const params = [];
    if (desde) { params.push(desde); conditions.push(`fecha >= $${params.length}`); }
    if (hasta) { params.push(hasta); conditions.push(`fecha <= $${params.length}`); }
    if (sucursalId) { params.push(sucursalId); conditions.push(`sucursal_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM gastos ${where} ORDER BY fecha ASC, id ASC`, params);

    const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['RNC/Cedula Proveedor', 'NCF', 'Fecha', 'Categoria', 'Proveedor', 'Descripcion', 'Monto Facturado', 'ITBIS Facturado', 'Metodo de Pago'].join(',');
    const rows = result.rows.map(g => [
      escapeCsv(g.rnc_proveedor),
      escapeCsv(g.ncf),
      g.fecha.toISOString().slice(0, 10),
      escapeCsv(g.categoria),
      escapeCsv(g.proveedor),
      escapeCsv(g.descripcion),
      parseFloat(g.monto).toFixed(2),
      parseFloat(g.itbis).toFixed(2),
      escapeCsv(g.metodo_pago)
    ].join(','));

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gastos_${(desde || 'todos')}_${(hasta || '')}.csv"`);
    res.send('﻿' + csv); // BOM para que Excel abra bien los acentos
  } catch (error) {
    console.error('Error exportando CSV:', error);
    res.status(500).json({ error: 'No se pudo exportar el CSV.' });
  }
};
