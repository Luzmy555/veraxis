const pool = require('../db');

exports.listarObservaciones = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const result = await pool.query(
      `SELECT id, usuario_id, usuario_nombre, usuario_rol, comentario, created_at
       FROM cliente_observaciones WHERE cliente_id = $1 ORDER BY created_at DESC`,
      [clienteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando observaciones' });
  }
};

exports.crearObservacion = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const comentario = req.body.comentario;
    if (!comentario) return res.status(400).json({ error: 'Comentario requerido' });

    const usuarioId = req.user.id;
    const usuarioRol = req.user.rol;
    const usuarioNombre = req.user.usuario;

    const result = await pool.query(
      `INSERT INTO cliente_observaciones (cliente_id, usuario_id, usuario_nombre, usuario_rol, comentario)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [clienteId, usuarioId, usuarioNombre, usuarioRol, comentario]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando observación' });
  }
};

exports.eliminarObservacion = async (req, res) => {
  try {
    const { id, obsId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para eliminar observaciones' });
    }
    await pool.query('DELETE FROM cliente_observaciones WHERE id = $1 AND cliente_id = $2', [obsId, id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando observación' });
  }
};
