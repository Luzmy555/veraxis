
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { usuario, clave } = req.body;

  try {
    // 1. Buscar usuario
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    const user = result.rows[0];

    if (user.estado === 'Inactivo') {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta a un administrador.' });
    }

    // 2. Comparar contraseña
    const passwordOk = await bcrypt.compare(clave, user.clave);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Clave incorrecta' });
    }

    // 3. Login exitoso: se firma un token, el cliente ya no puede inventarse el rol
    // sucursal_id null = ve todas las sedes (rol global); no-null = atado a una sede específica.
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol, sucursal_id: user.sucursal_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      id: user.id,
      usuario: user.usuario,
      rol: user.rol,
      sucursal_id: user.sucursal_id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en login' });
  }
};
