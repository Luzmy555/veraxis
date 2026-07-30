const pool = require('../db');
const { resolverFiltroSucursal } = require('../utils/sucursal');

const ESTADOS_VALIDOS = ['Activo', 'En mantenimiento', 'Fuera de servicio'];

function baseVehiculoQuery() {
  return `SELECT v.*, i.nombre AS instructor_nombre,
            (SELECT proximo_km FROM vehiculo_mantenimientos WHERE vehiculo_id = v.id ORDER BY fecha DESC, id DESC LIMIT 1) AS proximo_mantenimiento_km,
            (SELECT proximo_fecha FROM vehiculo_mantenimientos WHERE vehiculo_id = v.id ORDER BY fecha DESC, id DESC LIMIT 1) AS proximo_mantenimiento_fecha,
            (SELECT fecha FROM vehiculo_mantenimientos WHERE vehiculo_id = v.id ORDER BY fecha DESC, id DESC LIMIT 1) AS ultimo_mantenimiento_fecha
          FROM vehiculos v
          LEFT JOIN instructores i ON v.instructor_id = i.id`;
}

exports.getVehiculos = async (req, res) => {
  try {
    const sucursalId = resolverFiltroSucursal(req);
    const where = sucursalId ? 'WHERE v.sucursal_id = $1' : '';
    const params = sucursalId ? [sucursalId] : [];
    const result = await pool.query(`${baseVehiculoQuery()} ${where} ORDER BY v.placa`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error cargando vehículos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los vehículos.' });
  }
};

exports.getVehiculoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`${baseVehiculoQuery()} WHERE v.id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cargando vehículo:', error);
    res.status(500).json({ error: 'No se pudo cargar el vehículo.' });
  }
};

exports.crearVehiculo = async (req, res) => {
  try {
    const { placa, marca, modelo, anio, color, transmision, estado, kilometraje_actual, fecha_adquisicion, instructor_id, notas, sucursal_id } = req.body;

    if (!placa || !placa.trim()) return res.status(400).json({ error: 'La placa es requerida.' });
    if (!marca || !marca.trim()) return res.status(400).json({ error: 'La marca es requerida.' });
    if (estado && !ESTADOS_VALIDOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

    const duplicada = await pool.query('SELECT id FROM vehiculos WHERE UPPER(placa) = UPPER($1)', [placa.trim()]);
    if (duplicada.rowCount > 0) return res.status(409).json({ error: 'Ya existe un vehículo con esa placa.' });

    const result = await pool.query(
      `INSERT INTO vehiculos (placa, marca, modelo, anio, color, transmision, estado, kilometraje_actual, fecha_adquisicion, instructor_id, notas, sucursal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        placa.trim().toUpperCase(),
        marca.trim(),
        modelo || null,
        anio || null,
        color || null,
        transmision || 'Manual',
        estado || 'Activo',
        kilometraje_actual || 0,
        fecha_adquisicion || null,
        instructor_id || null,
        notas || null,
        sucursal_id || resolverFiltroSucursal(req) || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando vehículo:', error);
    res.status(500).json({ error: 'No se pudo crear el vehículo.' });
  }
};

exports.actualizarVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const { placa, marca, modelo, anio, color, transmision, estado, kilometraje_actual, fecha_adquisicion, instructor_id, notas, sucursal_id } = req.body;

    if (!placa || !placa.trim()) return res.status(400).json({ error: 'La placa es requerida.' });
    if (!marca || !marca.trim()) return res.status(400).json({ error: 'La marca es requerida.' });
    if (estado && !ESTADOS_VALIDOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

    const duplicada = await pool.query('SELECT id FROM vehiculos WHERE UPPER(placa) = UPPER($1) AND id <> $2', [placa.trim(), id]);
    if (duplicada.rowCount > 0) return res.status(409).json({ error: 'Ya existe otro vehículo con esa placa.' });

    const actual = await pool.query('SELECT sucursal_id FROM vehiculos WHERE id = $1', [id]);

    const result = await pool.query(
      `UPDATE vehiculos SET
         placa = $1, marca = $2, modelo = $3, anio = $4, color = $5,
         transmision = $6, estado = $7, kilometraje_actual = $8,
         fecha_adquisicion = $9, instructor_id = $10, notas = $11, sucursal_id = $12
       WHERE id = $13 RETURNING *`,
      [
        placa.trim().toUpperCase(),
        marca.trim(),
        modelo || null,
        anio || null,
        color || null,
        transmision || 'Manual',
        estado || 'Activo',
        kilometraje_actual || 0,
        fecha_adquisicion || null,
        instructor_id || null,
        notas || null,
        sucursal_id || actual.rows[0]?.sucursal_id || null,
        id
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando vehículo:', error);
    res.status(500).json({ error: 'No se pudo actualizar el vehículo.' });
  }
};

exports.eliminarVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM vehiculos WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando vehículo:', error);
    res.status(500).json({ error: 'No se pudo eliminar el vehículo.' });
  }
};
