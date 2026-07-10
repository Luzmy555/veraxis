const pool = require('../db');
const bcrypt = require('bcrypt');

exports.getConfiguracion = async (req, res) => {
  const result = await pool.query('SELECT * FROM configuracion WHERE id=1');
  res.json(result.rows[0]);
};

exports.updateConfiguracion = async (req, res) => {
  const { precio_curso, precio_inscripcion, clases_totales, duracion_dias } = req.body;

  await pool.query(`
    UPDATE configuracion
    SET precio_curso=$1, precio_inscripcion=$2,
        clases_totales=$3, duracion_dias=$4
    WHERE id=1
  `, [precio_curso, precio_inscripcion, clases_totales, duracion_dias]);

  res.json({ message: 'Configuración actualizada' });
};

exports.updateUsuario = async (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
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

exports.updateUsuarioSelf = async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { usuario, clave } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Identificador de usuario no proporcionado.' });
  }

  if (!usuario || !clave) {
    return res.status(400).json({ error: 'Usuario y clave son requeridos.' });
  }

  const hashedPassword = await bcrypt.hash(clave, 10);
  await pool.query(
    'UPDATE usuarios SET usuario=$1, clave=$2 WHERE id=$3',
    [usuario, hashedPassword, userId]
  );

  res.json({ message: 'Usuario actualizado' });
};

exports.login = async (req, res) => {
  const { usuario, clave } = req.body;

  const result = await pool.query(
    'SELECT * FROM usuarios WHERE usuario=$1',
    [usuario]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const valido = await bcrypt.compare(clave, result.rows[0].clave);
  if (!valido) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  res.json({ message: 'Login exitoso' });
};
