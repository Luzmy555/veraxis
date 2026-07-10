const bcrypt = require('bcryptjs');
const pool = require('../db');

(async () => {
  const usuario = 'admin';
  const clavePlana = '1234';

  const hash = await bcrypt.hash(clavePlana, 10);

  await pool.query(
    'INSERT INTO usuarios (usuario, clave) VALUES ($1, $2)',
    [usuario, hash]
  );

  console.log('✅ Usuario admin creado');
  process.exit();
})();
