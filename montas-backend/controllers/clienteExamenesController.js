const pool = require('../db');

const TIPOS_VALIDOS = ['Teórico', 'Práctico'];
const RESULTADOS_VALIDOS = ['Aprobado', 'Reprobado', 'Pendiente'];

exports.listarExamenes = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const result = await pool.query(
      `SELECT id, cliente_id, tipo, fecha, resultado, calificacion, intento_numero, observaciones,
              registrado_por, registrado_por_nombre, registrado_por_rol, created_at
       FROM cliente_examenes WHERE cliente_id = $1 ORDER BY fecha DESC, id DESC`,
      [clienteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando exámenes' });
  }
};

exports.crearExamen = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para registrar exámenes' });
    }

    const { tipo, fecha, resultado, calificacion, intento_numero, observaciones } = req.body;
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de examen inválido. Usa Teórico o Práctico.' });
    }
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    const resultadoFinal = resultado && RESULTADOS_VALIDOS.includes(resultado) ? resultado : 'Pendiente';
    if (calificacion !== undefined && calificacion !== null && calificacion !== '') {
      const cal = parseFloat(calificacion);
      if (isNaN(cal) || cal < 0 || cal > 100) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
      }
    }
    const intento = parseInt(intento_numero) || 1;

    const registradoPor = req.user.id;
    const registradoPorNombre = req.user.usuario;

    const result = await pool.query(
      `INSERT INTO cliente_examenes
        (cliente_id, tipo, fecha, resultado, calificacion, intento_numero, observaciones, registrado_por, registrado_por_nombre, registrado_por_rol)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [clienteId, tipo, fecha, resultadoFinal, calificacion || null, intento, observaciones || null, registradoPor, registradoPorNombre, requesterRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando examen' });
  }
};

exports.actualizarExamen = async (req, res) => {
  try {
    const { id, examId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para editar exámenes' });
    }

    const { tipo, fecha, resultado, calificacion, intento_numero, observaciones } = req.body;
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de examen inválido. Usa Teórico o Práctico.' });
    }
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    const resultadoFinal = resultado && RESULTADOS_VALIDOS.includes(resultado) ? resultado : 'Pendiente';
    if (calificacion !== undefined && calificacion !== null && calificacion !== '') {
      const cal = parseFloat(calificacion);
      if (isNaN(cal) || cal < 0 || cal > 100) {
        return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
      }
    }
    const intento = parseInt(intento_numero) || 1;

    const result = await pool.query(
      `UPDATE cliente_examenes
       SET tipo = $1, fecha = $2, resultado = $3, calificacion = $4, intento_numero = $5, observaciones = $6
       WHERE id = $7 AND cliente_id = $8 RETURNING *`,
      [tipo, fecha, resultadoFinal, calificacion || null, intento, observaciones || null, examId, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Examen no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando examen' });
  }
};

exports.eliminarExamen = async (req, res) => {
  try {
    const { id, examId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para eliminar exámenes' });
    }
    const result = await pool.query('DELETE FROM cliente_examenes WHERE id = $1 AND cliente_id = $2 RETURNING id', [examId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Examen no encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando examen' });
  }
};
