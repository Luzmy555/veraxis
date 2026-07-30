const pool = require('../db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { registrarAuditoria } = require('./auditoriaController');

// Whitelist de columnas editables de configuracion (evita construir SQL con nombres de columna arbitrarios).
const CAMPOS_CONFIG = [
  'nombre_sistema', 'logo_url', 'telefono', 'direccion',
  'rnc', 'whatsapp', 'correo', 'ciudad', 'redes_sociales', 'descripcion_corta',
  'precio_curso', 'precio_inscripcion', 'clases_totales', 'duracion_dias',
  'moneda', 'formato_moneda', 'permitir_pagos_parciales', 'requiere_inscripcion_inicial', 'metodos_pago_habilitados',
  'factura_prefijo', 'factura_numero_inicial', 'factura_pie_texto',
  'tema_color', 'tema_modo',
  'notif_recordatorio_clases', 'notif_avisos_pagos', 'notif_mensajes_internos',
  'portada_titulo', 'portada_subtitulo', 'nosotros_texto1', 'nosotros_texto2',
  'instagram_url', 'mapa_embed_url'
];

exports.getConfiguracion = async (req, res) => {
  const result = await pool.query('SELECT * FROM configuracion WHERE id=1');
  res.json(result.rows[0]);
};

// Público (sin token): solo nombre/logo, para poder mostrarlos en login.html antes de iniciar sesión.
exports.getBrandingPublico = async (req, res) => {
  try {
    const result = await pool.query('SELECT nombre_sistema, logo_url FROM configuracion WHERE id=1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error obteniendo branding público:', error);
    res.status(500).json({ error: 'No se pudo obtener el branding.' });
  }
};

// Público (sin token): todo lo que necesita inicio.html para pintarse solo, en una llamada.
exports.getPortadaPublica = async (req, res) => {
  try {
    const config = await pool.query(
      `SELECT nombre_sistema, logo_url, telefono, whatsapp, direccion, tema_color,
              portada_titulo, portada_subtitulo, portada_video_url,
              nosotros_texto1, nosotros_texto2, nosotros_imagen_url,
              instagram_url, mapa_embed_url
       FROM configuracion WHERE id = 1`
    );
    const galeria = await pool.query('SELECT id, tipo, archivo FROM landing_galeria ORDER BY orden, id');
    res.json({ ...(config.rows[0] || {}), galeria: galeria.rows });
  } catch (error) {
    console.error('Error obteniendo portada pública:', error);
    res.status(500).json({ error: 'No se pudo obtener la portada.' });
  }
};

exports.subirPortadaVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún video.' });

    const actual = await pool.query('SELECT portada_video_url FROM configuracion WHERE id = 1');
    const anterior = actual.rows[0]?.portada_video_url;

    const result = await pool.query(
      'UPDATE configuracion SET portada_video_url = $1 WHERE id = 1 RETURNING *',
      [req.file.filename]
    );

    if (anterior) {
      const filePath = path.join(__dirname, '..', 'uploads', 'config', anterior);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await registrarAuditoria(req, 'Actualizó el video de portada', req.file.originalname);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error subiendo video de portada:', error);
    res.status(500).json({ error: 'No se pudo guardar el video.' });
  }
};

exports.subirNosotrosImagen = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    const actual = await pool.query('SELECT nosotros_imagen_url FROM configuracion WHERE id = 1');
    const anterior = actual.rows[0]?.nosotros_imagen_url;

    const result = await pool.query(
      'UPDATE configuracion SET nosotros_imagen_url = $1 WHERE id = 1 RETURNING *',
      [req.file.filename]
    );

    if (anterior) {
      const filePath = path.join(__dirname, '..', 'uploads', 'config', anterior);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await registrarAuditoria(req, 'Actualizó la foto de "Sobre Nosotros"', req.file.originalname);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error subiendo foto de "Sobre Nosotros":', error);
    res.status(500).json({ error: 'No se pudo guardar la imagen.' });
  }
};

// Actualización parcial: cada pestaña de Configuración manda solo los campos que le corresponden.
exports.updateConfiguracion = async (req, res) => {
  try {
    const campos = Object.keys(req.body).filter(k => CAMPOS_CONFIG.includes(k));
    if (campos.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar.' });
    }

    const setClause = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map(c => req.body[c]);

    const result = await pool.query(
      `UPDATE configuracion SET ${setClause} WHERE id = 1 RETURNING *`,
      valores
    );

    await registrarAuditoria(req, 'Actualizó configuración', campos.join(', '));
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'No se pudo actualizar la configuración.' });
  }
};

exports.subirLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

    const actual = await pool.query('SELECT logo_url FROM configuracion WHERE id = 1');
    const anterior = actual.rows[0]?.logo_url;

    const result = await pool.query(
      'UPDATE configuracion SET logo_url = $1 WHERE id = 1 RETURNING *',
      [req.file.filename]
    );

    if (anterior) {
      const filePath = path.join(__dirname, '..', 'uploads', 'config', anterior);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await registrarAuditoria(req, 'Actualizó el logo de la academia', req.file.originalname);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({ error: 'No se pudo guardar el logo.' });
  }
};

// Lista liviana usada por Instructores (vincular cuenta) — se mantiene igual para no romper ese flujo.
// Lista liviana usada por Instructores para vincular una cuenta: se excluyen las
// cuentas de estudiante, no tiene sentido vincular un perfil de instructor a una.
exports.listarUsuarios = async (req, res) => {
  const result = await pool.query("SELECT id, usuario, rol FROM usuarios WHERE rol != 'estudiante' ORDER BY usuario");
  res.json(result.rows);
};

exports.updateUsuario = async (req, res) => {
  // Solo un admin llega aquí (requireAdmin en la ruta); puede editar cualquier usuario por id.
  const userId = req.body.userId;
  const { usuario, clave } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Identificador de usuario no proporcionado.' });
  }

  const hashedPassword = await bcrypt.hash(clave, 10);
  await pool.query(
    'UPDATE usuarios SET usuario=$1, clave=$2 WHERE id=$3',
    [usuario, hashedPassword, userId]
  );

  res.json({ message: 'Usuario actualizado' });
};

// Trae los datos propios del usuario logueado (para precargar el modal "Mi perfil").
exports.getUsuarioSelf = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, usuario, nombre_completo, correo, rol, estado FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil propio:', error);
    res.status(500).json({ error: 'No se pudo cargar tu perfil.' });
  }
};

exports.updateUsuarioSelf = async (req, res) => {
  // El id sale del token verificado, no de lo que mande el cliente: nadie puede editar la cuenta de otro.
  const userId = req.user.id;
  const { usuario, nombre_completo, correo, clave } = req.body;

  if (!usuario || !usuario.trim()) {
    return res.status(400).json({ error: 'El usuario es requerido.' });
  }
  if (clave && clave.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const actual = await pool.query('SELECT clave FROM usuarios WHERE id = $1', [userId]);
    if (actual.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const claveHash = clave ? await bcrypt.hash(clave, 10) : actual.rows[0].clave;

    const result = await pool.query(
      `UPDATE usuarios SET usuario = $1, nombre_completo = $2, correo = $3, clave = $4
       WHERE id = $5 RETURNING id, usuario, nombre_completo, correo, rol, estado`,
      [usuario.trim(), nombre_completo || null, correo || null, claveHash, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando perfil propio:', error);
    res.status(500).json({ error: 'No se pudo actualizar tu perfil.' });
  }
};
