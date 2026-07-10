const pool = require('../db');

(async () => {
  try {
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'asistencias' AND c.contype = 'c'
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
