const pool = require('../db');
const { resolverFiltroSucursal } = require('../utils/sucursal');

// Indexado por Date.getDay() (0 = Domingo), igual que DIAS_SEMANA en panel.html.
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Un instructor solo debe ver pendientes de sus propios estudiantes: mismo patrón
// que dashboardController.getResumen (el id de la cuenta no es el id del perfil de instructor).
async function resolverInstructorId(req) {
  const rol = req.user.rol;
  if (rol !== 'instructor' && rol !== 'usuario') return null;
  const perfil = await pool.query('SELECT id FROM instructores WHERE usuario_id = $1', [req.user.id]);
  return perfil.rows[0]?.id || null;
}

exports.getPendientes = async (req, res) => {
  try {
    const configRes = await pool.query(
      'SELECT notif_recordatorio_clases, notif_avisos_pagos FROM configuracion WHERE id = 1'
    );
    const flags = configRes.rows[0] || { notif_recordatorio_clases: false, notif_avisos_pagos: false };

    const esInstructor = req.user.rol === 'instructor' || req.user.rol === 'usuario';
    let instructorId = null;
    if (esInstructor) {
      instructorId = await resolverInstructorId(req);
      if (!instructorId) return res.json({ clases: [], pagos: [], flags });
    }
    const sucursalId = resolverFiltroSucursal(req);

    let clases = [];
    if (flags.notif_recordatorio_clases) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const diaManana = DIAS_SEMANA[manana.getDay()];

      const params = [diaManana];
      const conditions = ['h.dia = $1'];
      if (instructorId) { params.push(instructorId); conditions.push(`c.instructor_id = $${params.length}`); }
      if (sucursalId) { params.push(sucursalId); conditions.push(`c.sucursal_id = $${params.length}`); }

      const result = await pool.query(`
        SELECT h.id AS horario_id, h.dia, h.hora, c.id AS cliente_id, c.nombre, c.telefono
        FROM horarios h
        JOIN clientes c ON c.id = h.cliente_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY h.hora
      `, params);
      clases = result.rows;
    }

    let pagos = [];
    if (flags.notif_avisos_pagos) {
      const params = [];
      const conditions = ['saldo > 0'];
      if (instructorId) { params.push(instructorId); conditions.push(`instructor_id = $${params.length}`); }
      if (sucursalId) { params.push(sucursalId); conditions.push(`sucursal_id = $${params.length}`); }

      const result = await pool.query(`
        WITH saldos AS (
          SELECT c.id AS cliente_id, c.nombre, c.telefono, c.instructor_id, c.sucursal_id,
            (COALESCE(c.precio_total, 0) + COALESCE(c.inscripcion, 0) - COALESCE(c.descuento, 0))
              - COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.cliente_id = c.id), 0) AS saldo
          FROM clientes c
        )
        SELECT cliente_id, nombre, telefono, saldo
        FROM saldos
        WHERE ${conditions.join(' AND ')}
        ORDER BY saldo DESC
      `, params);
      pagos = result.rows;
    }

    res.json({ clases, pagos, flags });
  } catch (error) {
    console.error('Error obteniendo pendientes de notificaciones:', error);
    res.status(500).json({ error: 'Error obteniendo pendientes de notificaciones' });
  }
};
