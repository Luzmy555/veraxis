const pool = require('../db');

exports.getSucursales = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sucursales ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando sucursales:', error);
    res.status(500).json({ error: 'No se pudieron cargar las sucursales.' });
  }
};

exports.crearSucursal = async (req, res) => {
  try {
    const { nombre, direccion, telefono } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre de la sede es requerido.' });

    const result = await pool.query(
      'INSERT INTO sucursales (nombre, direccion, telefono) VALUES ($1, $2, $3) RETURNING *',
      [nombre.trim(), direccion || null, telefono || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json({ error: 'No se pudo crear la sede.' });
  }
};

exports.actualizarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, activo } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre de la sede es requerido.' });

    const result = await pool.query(
      `UPDATE sucursales SET nombre = $1, direccion = $2, telefono = $3, activo = $4
       WHERE id = $5 RETURNING *`,
      [nombre.trim(), direccion || null, telefono || null, activo !== false, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({ error: 'No se pudo actualizar la sede.' });
  }
};
