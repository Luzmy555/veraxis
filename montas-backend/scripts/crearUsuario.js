const bcrypt = require('bcryptjs');
const pool = require('../db');

(async () => {
  const usuario = 'luz mayra feliz';
  const clavePlana = 'prueba1';

  const hash = await bcrypt.hash(clavePlana, 10);

  await pool.query(
    'INSERT INTO usuarios (usuario, clave) VALUES ($1, $2)',
    [usuario, hash]
  );

  console.log('✅ Usuario "luz mayra feliz" creado');
  process.exit();
})();
