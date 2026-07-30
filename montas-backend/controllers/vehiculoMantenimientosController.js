const pool = require('../db');

exports.listarMantenimientos = async (req, res) => {
  try {
    const vehiculoId = req.params.id;
    const result = await pool.query(
      `SELECT * FROM vehiculo_mantenimientos WHERE vehiculo_id = $1 ORDER BY fecha DESC, id DESC`,
      [vehiculoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando mantenimientos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los mantenimientos.' });
  }
};

exports.crearMantenimiento = async (req, res) => {
  try {
    const vehiculoId = req.params.id;
    const { tipo, descripcion, fecha, kilometraje, costo, realizado_por, proximo_km, proximo_fecha } = req.body;

    if (!tipo || !tipo.trim()) return res.status(400).json({ error: 'El tipo de mantenimiento es requerido.' });
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida.' });

    const vehiculo = await pool.query('SELECT id FROM vehiculos WHERE id = $1', [vehiculoId]);
    if (vehiculo.rowCount === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });

    const registradoPor = req.user.id;
    const registradoPorNombre = req.user.usuario;

    const result = await pool.query(
      `INSERT INTO vehiculo_mantenimientos
        (vehiculo_id, tipo, descripcion, fecha, kilometraje, costo, realizado_por, proximo_km, proximo_fecha, registrado_por, registrado_por_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        vehiculoId, tipo.trim(), descripcion || null, fecha,
        kilometraje || null, costo || 0, realizado_por || null,
        proximo_km || null, proximo_fecha || null,
        registradoPor, registradoPorNombre
      ]
    );

    // Si el mantenimiento trae un kilometraje más reciente, actualiza el odómetro del vehículo
    if (kilometraje) {
      await pool.query(
        'UPDATE vehiculos SET kilometraje_actual = $1 WHERE id = $2 AND (kilometraje_actual IS NULL OR kilometraje_actual < $1)',
        [kilometraje, vehiculoId]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando mantenimiento:', error);
    res.status(500).json({ error: 'No se pudo registrar el mantenimiento.' });
  }
};

exports.eliminarMantenimiento = async (req, res) => {
  try {
    const { id, mantId } = req.params;
    const result = await pool.query(
      'DELETE FROM vehiculo_mantenimientos WHERE id = $1 AND vehiculo_id = $2 RETURNING id',
      [mantId, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro de mantenimiento no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Error eliminando mantenimiento:', error);
    res.status(500).json({ error: 'No se pudo eliminar el mantenimiento.' });
  }
};
