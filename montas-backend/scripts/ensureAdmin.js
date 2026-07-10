const pool = require('../db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Agregar columna rol si no existe
    const colCheck = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' AND column_name='rol'");
    if (colCheck.rowCount === 0) {
      await pool.query("ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT 'usuario'");
      console.log('✅ Columna rol agregada a usuarios');
    }

    const usuario = 'admin';
    const clavePlana = 'admin1234';
    const hashed = await bcrypt.hash(clavePlana, 10);

    const existing = await pool.query('SELECT id FROM usuarios WHERE usuario=$1', [usuario]);
    if (existing.rowCount === 0) {
      await pool.query(
        'INSERT INTO usuarios (usuario, clave, rol) VALUES ($1, $2, $3)',
        [usuario, hashed, 'admin']
      );
      console.log('✅ Usuario admin creado: admin / admin1234');
    } else {
      await pool.query(
        'UPDATE usuarios SET clave=$1, rol=$2 WHERE usuario=$3',
        [hashed, 'admin', usuario]
      );
      console.log('✅ Usuario admin actualizado: admin / admin1234');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
