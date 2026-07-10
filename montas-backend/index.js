

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const pool = require('./db');
const path = require('path');

const corsOptions = {
  origin: true,
  credentials: true,
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-role',
    'x-user-id',
    'x-user-name'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-user-id, x-user-name');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  next();
});

app.use(express.json());

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const clientesRoutes = require("./routes/clientes");
const pagosRoutes = require("./routes/pagos");
const asistenciasRoutes = require("./routes/asistencias");
const horariosRoutes = require("./routes/horarios");
const configuracionRoutes = require('./routes/configuracion');
const authRoutes = require('./routes/auth');
const cursosRoutes = require('./routes/cursos');
const instructoresRoutes = require('./routes/instructores');
const dashboardRoutes = require('./routes/dashboard');
const documentosRoutes = require('./routes/documentos');
const observacionesRoutes = require('./routes/observaciones');


// Rutas
app.use('/api/auth', authRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/asistencias", asistenciasRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/cursos", cursosRoutes);
app.use("/api/instructores", instructoresRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use('/api/clientes', documentosRoutes);
app.use('/api/clientes', observacionesRoutes);

const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        duracion_semanas INTEGER,
        precio NUMERIC(10,2) DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS instructores (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        correo TEXT,
        especialidad TEXT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS curso_instructor (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        instructor_id INTEGER NOT NULL REFERENCES instructores(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(curso_id, instructor_id)
      );
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS curso_id INTEGER;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS instructor_id INTEGER;
      ALTER TABLE horarios ADD COLUMN IF NOT EXISTS instructor_id INTEGER;
      -- Campos adicionales para expediente
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_requeridas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horas_completadas INTEGER DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sexo TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_emergencia TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_cliente TEXT DEFAULT 'Activo';
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion TEXT;

      -- Tabla para documentos del cliente
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

      -- Tabla para observaciones del cliente
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
    console.log('✅ Database schema checked and module-ready tables ensured.');
  } catch (error) {
    console.error('❌ Error initializing DB schema:', error);
  }
};

const startServer = async () => {
  await initializeDatabase();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Error conectando a la DB:', err.message);
    } else {
      console.log('✅ Conectado a PostgreSQL:', res.rows[0]);
    }
  });
};

startServer();
