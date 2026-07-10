const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_requeridas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_completadas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(10,2) DEFAULT 0;

      CREATE TABLE IF NOT EXISTS cliente_documentos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime TEXT,
        uploaded_by INTEGER,
        uploaded_by_role TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cliente_observaciones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        usuario_id INTEGER,
        usuario_nombre TEXT,
        usuario_rol TEXT,
        comentario TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tablas de expediente creadas/aseguradas');
  } catch (err) {
    console.error('Error creando tablas:', err);
  } finally {
    process.exit();
  }
})();
