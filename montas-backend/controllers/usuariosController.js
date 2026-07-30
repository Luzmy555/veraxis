const pool = require('../db');
const bcrypt = require('bcryptjs');
const { registrarAuditoria } = require('./auditoriaController');

const ROLES_VALIDOS = ['admin', 'usuario'];
const CAMPOS_RETORNO = 'id, usuario, nombre_completo, correo, rol, estado, sucursal_id, created_at';

// Las cuentas de estudiante se gestionan desde el expediente del cliente (botón
// "Acceso al portal"), no desde aquí, para no mezclarlas con las de admin/instructor.
exports.listarUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS_RETORNO} FROM usuarios WHERE rol != 'estudiante' ORDER BY usuario`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'No se pudieron cargar los usuarios.' });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const { nombre_completo, usuario, correo, rol, clave, confirmar_clave, sucursal_id } = req.body;

    if (!usuario || !usuario.trim()) return res.status(400).json({ error: 'El usuario es requerido.' });
    if (!rol || !ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    if (!clave || clave.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (clave !== confirmar_clave) return res.status(400).json({ error: 'Las contraseñas no coinciden.' });

    const duplicado = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario.trim()]);
    if (duplicado.rowCount > 0) return res.status(409).json({ error: 'Ya existe un usuario con ese nombre.' });

    const hash = await bcrypt.hash(clave, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (usuario, clave, rol, nombre_completo, correo, estado, sucursal_id)
       VALUES ($1,$2,$3,$4,$5,'Activo',$6) RETURNING ${CAMPOS_RETORNO}`,
      [usuario.trim(), hash, rol, nombre_completo || null, correo || null, sucursal_id || null]
    );

    await registrarAuditoria(req, 'Creó usuario', `${result.rows[0].usuario} (${rol})`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario.' });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, correo, rol, clave, confirmar_clave, sucursal_id } = req.body;

    if (rol && !ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });

    const actual = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (actual.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    let claveHash = actual.rows[0].clave;
    if (clave) {
      if (clave.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      if (clave !== confirmar_clave) return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
      claveHash = await bcrypt.hash(clave, 10);
    }

    const result = await pool.query(
      `UPDATE usuarios SET nombre_completo = $1, correo = $2, rol = $3, clave = $4, sucursal_id = $5
       WHERE id = $6 RETURNING ${CAMPOS_RETORNO}`,
      [
        nombre_completo !== undefined ? nombre_completo : actual.rows[0].nombre_completo,
        correo !== undefined ? correo : actual.rows[0].correo,
        rol || actual.rows[0].rol,
        claveHash,
        sucursal_id !== undefined ? (sucursal_id || null) : actual.rows[0].sucursal_id,
        id
      ]
    );

    await registrarAuditoria(req, 'Actualizó usuario', result.rows[0].usuario);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
  }
};

exports.cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['Activo', 'Inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });

    if (parseInt(id, 10) === req.user.id && estado === 'Inactivo') {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
    }

    const result = await pool.query(
      `UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING ${CAMPOS_RETORNO}`,
      [estado, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await registrarAuditoria(req, `${estado === 'Activo' ? 'Activó' : 'Desactivó'} usuario`, result.rows[0].usuario);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({ error: 'No se pudo cambiar el estado del usuario.' });
  }
};
