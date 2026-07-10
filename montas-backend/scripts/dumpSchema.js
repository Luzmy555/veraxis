const pool = require('../db');
(async () => {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('TABLES', tables.rows.map(r => r.table_name).join(', '));
    for (const row of tables.rows) {
      const cols = await pool.query(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
        [row.table_name]
      );
      console.log('---', row.table_name);
      console.log(JSON.stringify(cols.rows, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
})();
