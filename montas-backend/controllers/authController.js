
const pool = require('../db');
const bcrypt = require('bcryptjs');

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

    // 2. Comparar contraseña
    const passwordOk = await bcrypt.compare(clave, user.clave);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Clave incorrecta' });
    }

    // 3. Login exitoso
    res.json({
      id: user.id,
      usuario: user.usuario,
      rol: user.rol
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en login' });
  }
};
