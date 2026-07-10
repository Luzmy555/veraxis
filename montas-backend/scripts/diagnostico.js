const pool = require('../db');

(async () => {
  try {
    // 1. Verificar que admin existe y tiene rol correcto
    const adminCheck = await pool.query(
      "SELECT id, usuario, rol FROM usuarios WHERE usuario='admin'"
    );
    console.log('✅ Admin user:', adminCheck.rows[0] || 'NO ENCONTRADO');

    // 2. Verificar tablas existen
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('✅ Tablas:', tables.rows.map(t => t.table_name).join(', '));

    // 3. Verificar que cursos y instructores tienen registros
    const cursos = await pool.query('SELECT COUNT(*) as count FROM cursos');
    const instructores = await pool.query('SELECT COUNT(*) as count FROM instructores');
    console.log('✅ Cursos:', cursos.rows[0].count);
    console.log('✅ Instructores:', instructores.rows[0].count);

    // 4. Verificar clientes
    const clientes = await pool.query('SELECT COUNT(*) as count FROM clientes');
    console.log('✅ Clientes:', clientes.rows[0].count);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    process.exit();
  }
})();
