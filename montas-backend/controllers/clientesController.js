const pool = require('../db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { registrarAuditoria } = require('./auditoriaController');
const { resolverFiltroSucursal } = require('../utils/sucursal');

const uploadDir = path.join(__dirname, '..', 'uploads', 'clientes');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientDir = path.join(uploadDir, String(req.params.id || 'temp'));
    fs.mkdirSync(clientDir, { recursive: true });
    cb(null, clientDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').slice(0, 40) || 'foto';
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no permitido'));
    }
    cb(null, true);
  }
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validarCedulaUnica(cedula, id = null) {
  if (!cedula) return null;
  const result = await pool.query(
    'SELECT id FROM clientes WHERE cedula = $1 AND id <> COALESCE($2, -1)',
    [cedula, id]
  );
  return result.rows[0] ? 'Ya existe un cliente con esa cédula.' : null;
}

function baseClientQuery() {
  return `SELECT c.id,
                 c.nombre,
                 c.telefono,
                 c.cedula,
                 c.fecha_inicio AS fecha,
                 c.curso_actual,
                 c.precio_total,
                 c.inscripcion,
                 c.descuento,
                 c.curso_id,
                 c.instructor_id,
                 c.foto,
                 c.email,
                 c.sexo,
                 c.ciudad,
                 c.contacto_emergencia,
                 c.telefono_emergencia,
                 c.fecha_nacimiento,
                 c.direccion,
                 c.horas_requeridas,
                 c.horas_completadas,
                 c.estado_cliente,
                 i.nombre AS instructor_nombre,
                 cu.nombre AS curso_nombre
          FROM clientes c
          LEFT JOIN instructores i ON c.instructor_id = i.id
          LEFT JOIN cursos cu ON c.curso_id = cu.id`;
}

exports.upload = upload;

// Resuelve el expediente del estudiante logueado (nunca confiar en un id de la URL para esto).
exports.getMiExpediente = async (req, res) => {
  try {
    const result = await pool.query(`${baseClientQuery()} WHERE c.usuario_id = $1`, [req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tu cuenta todavía no está vinculada a ningún expediente. Pídele a un administrador que te dé acceso desde tu expediente.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cargando mi expediente:', error);
    res.status(500).json({ error: 'No se pudo cargar tu expediente.' });
  }
};

function generarUsuarioEstudiante(cliente) {
  const base = (cliente.cedula || cliente.nombre || 'estudiante')
    .toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base || 'estudiante'}${cliente.id}`;
}

// Crea (o devuelve, si ya existe) el acceso al portal del estudiante para este cliente.
exports.crearAccesoPortal = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await pool.query('SELECT id, nombre, cedula, usuario_id FROM clientes WHERE id = $1', [id]);
    if (cliente.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    if (cliente.rows[0].usuario_id) {
      const usuarioExistente = await pool.query('SELECT usuario FROM usuarios WHERE id = $1', [cliente.rows[0].usuario_id]);
      return res.json({ yaExistia: true, usuario: usuarioExistente.rows[0]?.usuario || null });
    }

    const usuario = generarUsuarioEstudiante(cliente.rows[0]);
    const claveTemporal = crypto.randomBytes(6).toString('base64url');
    const hash = await bcrypt.hash(claveTemporal, 10);

    // Transacción: si el UPDATE fallara después del INSERT, quedaría un usuario válido
    // pero sin vincular a ningún cliente (huérfano) — con esto, o pasan ambas o ninguna.
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const nuevoUsuario = await db.query(
        `INSERT INTO usuarios (usuario, clave, rol, nombre_completo, estado)
         VALUES ($1, $2, 'estudiante', $3, 'Activo') RETURNING id`,
        [usuario, hash, cliente.rows[0].nombre]
      );
      await db.query('UPDATE clientes SET usuario_id = $1 WHERE id = $2', [nuevoUsuario.rows[0].id, id]);
      await db.query('COMMIT');
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    } finally {
      db.release();
    }

    await registrarAuditoria(req, 'Dio acceso al portal del estudiante', `${cliente.rows[0].nombre} (usuario: ${usuario})`);
    res.status(201).json({ yaExistia: false, usuario, clave_temporal: claveTemporal });
  } catch (error) {
    console.error('Error creando acceso al portal:', error);
    res.status(500).json({ error: 'No se pudo crear el acceso al portal.' });
  }
};

exports.getSeguimiento = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const params = [];
    let where = '';
    if (instructor_id) {
      params.push(instructor_id);
      where = 'WHERE c.instructor_id = $1';
    }
    const result = await pool.query(`
      SELECT c.id, c.nombre, c.curso_actual, c.curso_id, c.instructor_id, c.estado_cliente,
             c.horas_completadas, c.horas_requeridas,
             i.nombre AS instructor_nombre,
             (SELECT AVG(calificacion) FROM cliente_evaluaciones WHERE cliente_id = c.id AND calificacion IS NOT NULL) AS promedio_evaluaciones,
             (SELECT COUNT(*) FROM cliente_evaluaciones WHERE cliente_id = c.id) AS total_evaluaciones,
             (SELECT MAX(fecha) FROM cliente_evaluaciones WHERE cliente_id = c.id) AS ultima_evaluacion
      FROM clientes c
      LEFT JOIN instructores i ON c.instructor_id = i.id
      ${where}
      ORDER BY c.nombre
    `, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error cargando seguimiento:', error);
    res.status(500).json({ error: 'No se pudo cargar el seguimiento de progreso.' });
  }
};

exports.getClientes = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const sucursalId = resolverFiltroSucursal(req);
    const conditions = [];
    const params = [];
    if (instructor_id) { params.push(instructor_id); conditions.push(`c.instructor_id = $${params.length}`); }
    if (sucursalId) { params.push(sucursalId); conditions.push(`c.sucursal_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`${baseClientQuery()} ${where} ORDER BY c.id DESC`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error cargando clientes:', error);
    res.status(500).json({ error: 'No se pudieron cargar los clientes.' });
  }
};

exports.getClientePorId = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`${baseClientQuery()} WHERE c.id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cargando cliente:', error);
    res.status(500).json({ error: 'No se pudo cargar el cliente.' });
  }
};

exports.crearCliente = async (req, res) => {
  const {
    nombre,
    telefono,
    cedula,
    fecha,
    curso_actual,
    precio_total,
    inscripcion,
    descuento,
    curso_id,
    instructor_id,
    foto,
    email,
    sexo,
    ciudad,
    contacto_emergencia,
    telefono_emergencia,
    fecha_nacimiento,
    direccion,
    horas_requeridas,
    horas_completadas,
    estado_cliente,
    sucursal_id
  } = req.body;

  try {
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }

    const duplicateError = await validarCedulaUnica(cedula);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    const result = await pool.query(
      `INSERT INTO clientes
      (
        nombre,
        telefono,
        cedula,
        fecha_inicio,
        curso_actual,
        precio_total,
        inscripcion,
        descuento,
        curso_id,
        instructor_id,
        foto,
        email,
        sexo,
        ciudad,
        contacto_emergencia,
        telefono_emergencia,
        fecha_nacimiento,
        direccion,
        horas_requeridas,
        horas_completadas,
        estado_cliente,
        sucursal_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `, [
      nombre,
      telefono,
      cedula,
      fecha,
      curso_actual,
      parseFloat(precio_total) || 0,
      parseFloat(inscripcion) || 0,
      parseFloat(descuento) || 0,
      curso_id || null,
      instructor_id || null,
      foto || null,
      email || null,
      sexo || null,
      ciudad || null,
      contacto_emergencia || null,
      telefono_emergencia || null,
      fecha_nacimiento || null,
      direccion || null,
      parseInt(horas_requeridas) || 0,
      parseInt(horas_completadas) || 0,
      estado_cliente || 'Inscrito',
      sucursal_id || resolverFiltroSucursal(req) || null
    ]);

    await registrarAuditoria(req, 'Creó cliente', result.rows[0].nombre);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'No se pudo crear el cliente.' });
  }
};

exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    telefono,
    cedula,
    fecha,
    curso_actual,
    precio_total,
    inscripcion,
    descuento,
    curso_id,
    instructor_id,
    foto,
    email,
    sexo,
    ciudad,
    contacto_emergencia,
    telefono_emergencia,
    fecha_nacimiento,
    direccion,
    horas_requeridas,
    horas_completadas,
    estado_cliente,
    sucursal_id
  } = req.body;

  try {
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }

    const duplicateError = await validarCedulaUnica(cedula, id);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    const actual = await pool.query('SELECT sucursal_id FROM clientes WHERE id = $1', [id]);

    const result = await pool.query(
      `UPDATE clientes
       SET nombre = $1,
           telefono = $2,
           cedula = $3,
           fecha_inicio = $4,
           curso_actual = $5,
           precio_total = $6,
           inscripcion = $7,
           descuento = $8,
           curso_id = $9,
           instructor_id = $10,
           foto = $11,
           email = $12,
           sexo = $13,
           ciudad = $14,
           contacto_emergencia = $15,
           telefono_emergencia = $16,
           fecha_nacimiento = $17,
           direccion = $18,
           horas_requeridas = $19,
           horas_completadas = $20,
           estado_cliente = $21,
           sucursal_id = $22
       WHERE id = $23
       RETURNING *`,
      [
        nombre,
        telefono,
        cedula,
        fecha,
        curso_actual,
        parseFloat(precio_total) || 0,
        parseFloat(inscripcion) || 0,
        parseFloat(descuento) || 0,
        curso_id || null,
        instructor_id || null,
        foto || null,
        email || null,
        sexo || null,
        ciudad || null,
        contacto_emergencia || null,
        telefono_emergencia || null,
        fecha_nacimiento || null,
        direccion || null,
        parseInt(horas_requeridas) || 0,
        parseInt(horas_completadas) || 0,
        estado_cliente || 'Inscrito',
        sucursal_id || actual.rows[0]?.sucursal_id || null,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'No se pudo actualizar el cliente.' });
  }
};

exports.subirFotoCliente = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna fotografía.' });
    }

    const clienteActual = await pool.query('SELECT foto FROM clientes WHERE id = $1', [id]);
    const previousPhoto = clienteActual.rows[0]?.foto;
    if (previousPhoto) {
      const oldPath = path.join(uploadDir, String(id), previousPhoto);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const result = await pool.query(
      'UPDATE clientes SET foto = $1 WHERE id = $2 RETURNING *',
      [req.file.filename, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error subiendo foto:', error);
    res.status(500).json({ error: 'No se pudo guardar la fotografía.' });
  }
};

exports.eliminarCliente = async (req, res) => {
  const { id } = req.params;
  const actual = await pool.query('SELECT nombre, usuario_id FROM clientes WHERE id = $1', [id]);
  // Si el cliente tenía acceso al portal, se desactiva esa cuenta antes de borrarlo — de lo
  // contrario queda una credencial válida (usuario/clave que sí autentican) sin ningún
  // expediente detrás, y el "estudiante" ve un portal vacío sin entender por qué.
  if (actual.rows[0]?.usuario_id) {
    await pool.query("UPDATE usuarios SET estado = 'Inactivo' WHERE id = $1", [actual.rows[0].usuario_id]);
  }
  await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
  if (actual.rowCount > 0) {
    await registrarAuditoria(req, 'Eliminó cliente', actual.rows[0].nombre);
  }
  res.status(204).send();
};
