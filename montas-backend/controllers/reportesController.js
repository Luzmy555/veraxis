const pool = require('../db');

// Reportes ejecutivos: métricas que hoy no expone ningún endpoint (rendimiento por
// instructor, aprobación de exámenes, ingresos por curso). El flujo de caja ya lo
// calcula cajaController.getReportes (/api/caja/reportes) y no se duplica aquí.
exports.getEjecutivo = async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const desde = req.query.desde || hoy.slice(0, 8) + '01';
    const hasta = req.query.hasta || hoy;

    // Subqueries correlacionadas por cliente (evita el "fan-out" de juntar
    // evaluaciones + exámenes + pagos directamente, que multiplicaría las sumas).
    const porInstructor = await pool.query(
      `WITH clientes_metricas AS (
         SELECT c.id, c.instructor_id, c.estado_cliente, c.horas_completadas, c.horas_requeridas,
                (SELECT AVG(calificacion) FROM cliente_evaluaciones WHERE cliente_id = c.id AND calificacion IS NOT NULL) AS promedio_evaluaciones,
                (SELECT COUNT(*) FROM cliente_examenes WHERE cliente_id = c.id AND tipo = 'Práctico' AND resultado IN ('Aprobado','Reprobado') AND fecha BETWEEN $1 AND $2) AS practicos_evaluados,
                (SELECT COUNT(*) FROM cliente_examenes WHERE cliente_id = c.id AND tipo = 'Práctico' AND resultado = 'Aprobado' AND fecha BETWEEN $1 AND $2) AS practicos_aprobados,
                (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE cliente_id = c.id AND fecha BETWEEN $1 AND $2) AS ingresos
         FROM clientes c
       )
       SELECT i.id, i.nombre,
              COUNT(cm.id) FILTER (WHERE cm.estado_cliente = 'Activo') AS estudiantes_activos,
              COUNT(cm.id) AS estudiantes_total,
              AVG(CASE WHEN cm.horas_requeridas > 0 THEN cm.horas_completadas::numeric / cm.horas_requeridas * 100 END) AS avance_horas_promedio,
              AVG(cm.promedio_evaluaciones) AS promedio_evaluaciones,
              COALESCE(SUM(cm.practicos_evaluados), 0) AS practicos_evaluados,
              COALESCE(SUM(cm.practicos_aprobados), 0) AS practicos_aprobados,
              COALESCE(SUM(cm.ingresos), 0) AS ingresos_generados
       FROM instructores i
       LEFT JOIN clientes_metricas cm ON cm.instructor_id = i.id
       GROUP BY i.id, i.nombre
       ORDER BY i.nombre`,
      [desde, hasta]
    );

    const examenesPorTipo = await pool.query(
      `SELECT tipo, resultado, COUNT(*) AS cantidad
       FROM cliente_examenes
       WHERE fecha BETWEEN $1 AND $2
       GROUP BY tipo, resultado
       ORDER BY tipo, resultado`,
      [desde, hasta]
    );

    const porCurso = await pool.query(
      `SELECT cu.id, cu.nombre,
              COUNT(DISTINCT c.id) AS estudiantes,
              COALESCE(SUM(p.monto) FILTER (WHERE p.fecha BETWEEN $1 AND $2), 0) AS ingresos
       FROM cursos cu
       LEFT JOIN clientes c ON c.curso_id = cu.id
       LEFT JOIN pagos p ON p.cliente_id = c.id
       GROUP BY cu.id, cu.nombre
       ORDER BY cu.nombre`,
      [desde, hasta]
    );

    // Arma el resumen de exámenes por tipo con conteos y tasa de aprobación
    // (excluye "Pendiente" del cálculo de tasa: todavía no tiene resultado decidido).
    const resumenExamenes = {};
    let totalAprobados = 0;
    let totalDecididos = 0;
    for (const fila of examenesPorTipo.rows) {
      const tipo = fila.tipo;
      if (!resumenExamenes[tipo]) {
        resumenExamenes[tipo] = { Aprobado: 0, Reprobado: 0, Pendiente: 0 };
      }
      const cantidad = parseInt(fila.cantidad, 10);
      resumenExamenes[tipo][fila.resultado] = cantidad;
      if (fila.resultado === 'Aprobado') totalAprobados += cantidad;
      if (fila.resultado === 'Aprobado' || fila.resultado === 'Reprobado') totalDecididos += cantidad;
    }
    for (const tipo of Object.keys(resumenExamenes)) {
      const r = resumenExamenes[tipo];
      const decididos = r.Aprobado + r.Reprobado;
      r.tasa_aprobacion = decididos > 0 ? (r.Aprobado / decididos) * 100 : null;
    }

    res.json({
      desde, hasta,
      porInstructor: porInstructor.rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        estudiantes_activos: parseInt(r.estudiantes_activos, 10),
        estudiantes_total: parseInt(r.estudiantes_total, 10),
        avance_horas_promedio: r.avance_horas_promedio !== null ? parseFloat(r.avance_horas_promedio) : null,
        promedio_evaluaciones: r.promedio_evaluaciones !== null ? parseFloat(r.promedio_evaluaciones) : null,
        practicos_evaluados: parseInt(r.practicos_evaluados, 10),
        practicos_aprobados: parseInt(r.practicos_aprobados, 10),
        tasa_aprobacion_practico: parseInt(r.practicos_evaluados, 10) > 0
          ? (parseInt(r.practicos_aprobados, 10) / parseInt(r.practicos_evaluados, 10)) * 100
          : null,
        ingresos_generados: parseFloat(r.ingresos_generados)
      })),
      examenes: {
        porTipo: resumenExamenes,
        tasa_aprobacion_global: totalDecididos > 0 ? (totalAprobados / totalDecididos) * 100 : null
      },
      porCurso: porCurso.rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        estudiantes: parseInt(r.estudiantes, 10),
        ingresos: parseFloat(r.ingresos)
      }))
    });
  } catch (error) {
    console.error('Error generando reportes ejecutivos:', error);
    res.status(500).json({ error: 'No se pudo generar el reporte ejecutivo.' });
  }
};
