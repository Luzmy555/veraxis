const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      -- Añadir campos faltantes a tabla clientes
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sexo TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_emergencia TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_cliente TEXT DEFAULT 'Activo';
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion TEXT;
      
      -- Verificar que existan otros campos
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_requeridas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_completadas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS curso_id INTEGER;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS instructor_id INTEGER;
    `);
    console.log('✅ Todos los campos de expediente han sido creados/asegurados.');
  } catch (err) {
    console.error('❌ Error creando/asegurando campos:', err);
  } finally {
    process.exit();
  }
})();
