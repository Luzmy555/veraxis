const pool = require('../db');

exports.getResumen = async (req, res) => {
  const userRole = (req.headers['x-user-role'] || '').toString().toLowerCase();
  const userId = req.headers['x-user-id'];

  if ((userRole === 'instructor' || userRole === 'usuario') && userId) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE instructor_id = $1) AS total_clientes,
        (SELECT COUNT(*) FROM pagos p JOIN clientes c ON c.id = p.cliente_id WHERE c.instructor_id = $1) AS total_pagos,
        (SELECT COUNT(*) FROM asistencias a JOIN clientes c ON c.id = a.cliente_id WHERE c.instructor_id = $1) AS total_asistencias,
        (SELECT COUNT(DISTINCT curso_id) FROM clientes WHERE instructor_id = $1 AND curso_id IS NOT NULL) AS total_cursos,
        1 AS total_instructores,
        COALESCE((SELECT SUM(p.monto) FROM pagos p JOIN clientes c ON c.id = p.cliente_id WHERE c.instructor_id = $1), 0) AS ingresos_totales
    `, [userId]);
    return res.json(result.rows[0]);
  }

  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM clientes) AS total_clientes,
      (SELECT COUNT(*) FROM pagos) AS total_pagos,
      (SELECT COUNT(*) FROM asistencias) AS total_asistencias,
      (SELECT COUNT(*) FROM cursos) AS total_cursos,
      (SELECT COUNT(*) FROM instructores) AS total_instructores,
      COALESCE((SELECT SUM(monto) FROM pagos), 0) AS ingresos_totales
  `);
  res.json(result.rows[0]);
};
