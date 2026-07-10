const pool = require('./db');
const bcrypt = require('bcryptjs');

async function crearUsuario() {
  try {
    const usuario = 'luzmayra';
    const clavePlano = 'prueba1';

    const hash = await bcrypt.hash(clavePlano, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (usuario, clave)
       VALUES ($1, $2)
       RETURNING *`,
      [usuario, hash]
    );

    console.log('Usuario creado:', result.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

crearUsuario();