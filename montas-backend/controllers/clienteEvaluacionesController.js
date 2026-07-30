const pool = require('../db');

const TIPOS_VALIDOS = ['Teórica', 'Práctica'];

exports.listarEvaluaciones = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const result = await pool.query(
      `SELECT id, cliente_id, tipo, fecha, calificacion, comentarios,
              registrado_por, registrado_por_nombre, registrado_por_rol, created_at
       FROM cliente_evaluaciones WHERE cliente_id = $1 ORDER BY fecha DESC, id DESC`,
      [clienteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando evaluaciones' });
  }
};

exports.crearEvaluacion = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para registrar evaluaciones' });
    }

    const { tipo, fecha, calificacion, comentarios } = req.body;
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de evaluación inválido. Usa Teórica o Práctica.' });
    }
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    if (calificacion !== undefined && calificacion !== null && calificacion !== '') {
      const cal = parseFloat(calificacion);
      if (isNaN(cal) || cal < 0 || cal > 100) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
      }
    }

    const registradoPor = req.user.id;
    const registradoPorNombre = req.user.usuario;

    const result = await pool.query(
      `INSERT INTO cliente_evaluaciones
        (cliente_id, tipo, fecha, calificacion, comentarios, registrado_por, registrado_por_nombre, registrado_por_rol)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [clienteId, tipo, fecha, calificacion || null, comentarios || null, registradoPor, registradoPorNombre, requesterRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando evaluación' });
  }
};

exports.actualizarEvaluacion = async (req, res) => {
  try {
    const { id, evalId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para editar evaluaciones' });
    }

    const { tipo, fecha, calificacion, comentarios } = req.body;
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de evaluación inválido. Usa Teórica o Práctica.' });
    }
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    if (calificacion !== undefined && calificacion !== null && calificacion !== '') {
      const cal = parseFloat(calificacion);
      if (isNaN(cal) || cal < 0 || cal > 100) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
      }
    }

    const result = await pool.query(
      `UPDATE cliente_evaluaciones SET tipo = $1, fecha = $2, calificacion = $3, comentarios = $4
       WHERE id = $5 AND cliente_id = $6 RETURNING *`,
      [tipo, fecha, calificacion || null, comentarios || null, evalId, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Evaluación no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando evaluación' });
  }
};

exports.eliminarEvaluacion = async (req, res) => {
  try {
    const { id, evalId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para eliminar evaluaciones' });
    }
    const result = await pool.query('DELETE FROM cliente_evaluaciones WHERE id = $1 AND cliente_id = $2 RETURNING id', [evalId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Evaluación no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando evaluación' });
  }
};
