const pool = require('../db');
const fs = require('fs');
const path = require('path');

const ESTADOS_VALIDOS = ['Pendiente', 'Emitido'];
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'certificados');

async function generarNumeroCertificado() {
  const anio = new Date().getFullYear();
  const prefijo = `MAA-${anio}-`;
  const result = await pool.query(
    `SELECT numero_certificado FROM cliente_certificados
     WHERE numero_certificado LIKE $1
     ORDER BY numero_certificado DESC LIMIT 1`,
    [`${prefijo}%`]
  );
  let siguiente = 1;
  if (result.rowCount > 0) {
    const ultimo = result.rows[0].numero_certificado;
    const numero = parseInt(ultimo.slice(prefijo.length), 10);
    if (!isNaN(numero)) siguiente = numero + 1;
  }
  return `${prefijo}${String(siguiente).padStart(4, '0')}`;
}

// Verifica que el estudiante haya completado sus horas antes de permitir emitir el certificado.
// Se puede saltar mandando forzar=true (decisión consciente del admin).
async function validarHorasParaEmision(clienteId, forzar) {
  if (forzar) return null;
  const cliente = await pool.query('SELECT horas_completadas, horas_requeridas FROM clientes WHERE id = $1', [clienteId]);
  const c = cliente.rows[0];
  if (!c) return 'Cliente no encontrado';
  const requeridas = c.horas_requeridas || 0;
  const completadas = c.horas_completadas || 0;
  if (requeridas > 0 && completadas < requeridas) {
    return `El estudiante lleva ${completadas} de ${requeridas} horas requeridas. No se puede emitir el certificado todavía (puedes forzar la emisión si es una excepción justificada).`;
  }
  return null;
}

exports.listarCertificados = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const result = await pool.query(
      `SELECT cc.id, cc.cliente_id, cc.curso_id, cc.numero_certificado, cc.fecha_emision, cc.estado,
              cc.archivo, cc.archivo_original_name, cc.archivo_mime,
              cc.emitido_por, cc.emitido_por_nombre, cc.created_at,
              cu.nombre AS curso_nombre
       FROM cliente_certificados cc
       LEFT JOIN cursos cu ON cc.curso_id = cu.id
       WHERE cc.cliente_id = $1 ORDER BY cc.created_at DESC`,
      [clienteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando certificados' });
  }
};

exports.getCertificadoPorId = async (req, res) => {
  try {
    const { id, certId } = req.params;
    const result = await pool.query(
      `SELECT cc.*, cu.nombre AS curso_nombre, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula
       FROM cliente_certificados cc
       LEFT JOIN cursos cu ON cc.curso_id = cu.id
       LEFT JOIN clientes c ON cc.cliente_id = c.id
       WHERE cc.id = $1 AND cc.cliente_id = $2`,
      [certId, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Certificado no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error cargando certificado' });
  }
};

exports.crearCertificado = async (req, res) => {
  try {
    const clienteId = req.params.id;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para registrar certificados' });
    }

    const { curso_id, fecha_emision, estado, forzar } = req.body;
    let { numero_certificado } = req.body;
    const estadoFinal = estado && ESTADOS_VALIDOS.includes(estado) ? estado : 'Pendiente';

    if (estadoFinal === 'Emitido') {
      const errorHoras = await validarHorasParaEmision(clienteId, forzar === true || forzar === 'true');
      if (errorHoras) return res.status(400).json({ error: errorHoras });
      if (!numero_certificado || !numero_certificado.trim()) {
        numero_certificado = await generarNumeroCertificado();
      }
    }

    const emitidoPor = req.user.id;
    const emitidoPorNombre = req.user.usuario;

    const archivo = req.file ? req.file.filename : null;
    const archivoOriginalName = req.file ? req.file.originalname : null;
    const archivoMime = req.file ? req.file.mimetype : null;

    const result = await pool.query(
      `INSERT INTO cliente_certificados
        (cliente_id, curso_id, numero_certificado, fecha_emision, estado, archivo, archivo_original_name, archivo_mime, emitido_por, emitido_por_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [clienteId, curso_id || null, numero_certificado || null, fecha_emision || null, estadoFinal, archivo, archivoOriginalName, archivoMime, emitidoPor, emitidoPorNombre]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando certificado' });
  }
};

exports.actualizarCertificado = async (req, res) => {
  try {
    const { id, certId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador', 'instructor', 'usuario'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para actualizar certificados' });
    }

    const actual = await pool.query('SELECT * FROM cliente_certificados WHERE id = $1 AND cliente_id = $2', [certId, id]);
    if (actual.rowCount === 0) return res.status(404).json({ error: 'Certificado no encontrado' });

    const { curso_id, fecha_emision, estado, forzar } = req.body;
    let { numero_certificado } = req.body;
    const estadoFinal = estado && ESTADOS_VALIDOS.includes(estado) ? estado : actual.rows[0].estado;

    if (estadoFinal === 'Emitido' && actual.rows[0].estado !== 'Emitido') {
      const errorHoras = await validarHorasParaEmision(id, forzar === true || forzar === 'true');
      if (errorHoras) return res.status(400).json({ error: errorHoras });
    }
    if (estadoFinal === 'Emitido' && (!numero_certificado || !numero_certificado.trim()) && !actual.rows[0].numero_certificado) {
      numero_certificado = await generarNumeroCertificado();
    }

    const result = await pool.query(
      `UPDATE cliente_certificados SET
         curso_id = $1, fecha_emision = $2, estado = $3, numero_certificado = $4
       WHERE id = $5 RETURNING *`,
      [
        curso_id !== undefined ? (curso_id || null) : actual.rows[0].curso_id,
        fecha_emision !== undefined ? (fecha_emision || null) : actual.rows[0].fecha_emision,
        estadoFinal,
        numero_certificado || actual.rows[0].numero_certificado,
        certId
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando certificado' });
  }
};

exports.descargarCertificado = async (req, res) => {
  try {
    const { id, certId } = req.params;
    const result = await pool.query('SELECT * FROM cliente_certificados WHERE id = $1 AND cliente_id = $2', [certId, id]);
    const cert = result.rows[0];
    if (!cert || !cert.archivo) return res.status(404).json({ error: 'Archivo de certificado no encontrado' });

    const filePath = path.join(UPLOADS_DIR, String(id), cert.archivo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en servidor' });

    const inline = (cert.archivo_mime || '').startsWith('image/') || cert.archivo_mime === 'application/pdf';
    res.setHeader('Content-Type', cert.archivo_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${cert.archivo_original_name || cert.archivo}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error descargando certificado' });
  }
};

exports.eliminarCertificado = async (req, res) => {
  try {
    const { id, certId } = req.params;
    const requesterRole = req.user.rol;
    if (!['admin', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para eliminar certificados' });
    }
    const result = await pool.query('SELECT * FROM cliente_certificados WHERE id = $1 AND cliente_id = $2', [certId, id]);
    const cert = result.rows[0];
    if (!cert) return res.status(404).json({ error: 'Certificado no encontrado' });

    if (cert.archivo) {
      const filePath = path.join(UPLOADS_DIR, String(id), cert.archivo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM cliente_certificados WHERE id = $1', [certId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando certificado' });
  }
};
