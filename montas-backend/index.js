

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const pool = require('./db');
const path = require('path');
const logger = require('./logger');

// Los controladores ya usan console.error(...) en cada catch (decenas de archivos); en vez
// de reescribirlos todos para usar el logger directamente, console.error también escribe al
// archivo de logs a partir de aquí — así queda centralizado sin tocar cada controlador.
const consoleErrorOriginal = console.error.bind(console);
console.error = (...args) => {
  consoleErrorOriginal(...args);
  logger.error(args.map(a => (a instanceof Error ? a.stack : a)).join(' '));
};

process.on('unhandledRejection', (reason) => {
  logger.error(`unhandledRejection: ${reason instanceof Error ? reason.stack : reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`uncaughtException: ${err.stack}`);
  process.exit(1);
});

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
    'Authorization'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  next();
});

app.use(express.json());

// Servir archivos subidos: uploadsAccess filtra qué queda público antes del static
// (fotos de cliente y logos de marca sí; documentos/certificados/comprobantes, no).
const uploadsAccess = require('./middlewares/uploadsAccess');
app.use('/uploads', uploadsAccess, express.static(path.join(__dirname, 'uploads')));

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
const evaluacionesRoutes = require('./routes/evaluaciones');
const examenesRoutes = require('./routes/examenes');
const certificadosRoutes = require('./routes/certificados');
const vehiculosRoutes = require('./routes/vehiculos');
const gastosRoutes = require('./routes/gastos');
const cajaRoutes = require('./routes/caja');
const usuariosRoutes = require('./routes/usuarios');
const auditoriaRoutes = require('./routes/auditoria');
const reportesRoutes = require('./routes/reportes');
const galeriaRoutes = require('./routes/galeria');
const sucursalesRoutes = require('./routes/sucursales');
const { verifyToken } = require('./middlewares/authMiddleware');

// /api/auth (login), /api/configuracion/branding (nombre/logo para login.html) y las
// lecturas de la portada/galería pública (inicio.html, sin sesión) son las únicas rutas
// públicas. POST/DELETE sobre esas mismas rutas siguen exigiendo token + admin.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) return next();
  if (req.path === '/api/configuracion/branding') return next();
  if (req.method === 'GET' && (req.path === '/api/configuracion/portada' || req.path === '/api/galeria')) return next();
  return verifyToken(req, res, next);
});

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
app.use('/api/clientes', evaluacionesRoutes);
app.use('/api/clientes', examenesRoutes);
app.use('/api/clientes', certificadosRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/galeria', galeriaRoutes);
app.use('/api/sucursales', sucursalesRoutes);

// Manejador de errores: convierte rechazos de multer (archivo inválido/muy grande) y
// otros errores no controlados en JSON, en vez de la página HTML de error por defecto.
const multer = require('multer');
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido (5 MB).' });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error('Error no controlado:', err);
  res.status(400).json({ error: err.message || 'Error procesando la solicitud' });
});

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
      -- Vincula el cliente (estudiante) con su cuenta de acceso al portal (usuarios, rol 'estudiante')
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
      ALTER TABLE horarios ADD COLUMN IF NOT EXISTS instructor_id INTEGER;
      -- Vincula el perfil de instructor con su cuenta de acceso (usuarios)
      ALTER TABLE instructores ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
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

      -- Tabla para evaluaciones de progreso del cliente
      CREATE TABLE IF NOT EXISTS cliente_evaluaciones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        fecha DATE NOT NULL,
        calificacion NUMERIC(5,2),
        comentarios TEXT,
        registrado_por INTEGER,
        registrado_por_nombre TEXT,
        registrado_por_rol TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla para intentos de examen del cliente
      CREATE TABLE IF NOT EXISTS cliente_examenes (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        fecha DATE NOT NULL,
        resultado TEXT NOT NULL DEFAULT 'Pendiente',
        calificacion NUMERIC(5,2),
        intento_numero INTEGER NOT NULL DEFAULT 1,
        observaciones TEXT,
        registrado_por INTEGER,
        registrado_por_nombre TEXT,
        registrado_por_rol TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla para certificados emitidos al cliente
      CREATE TABLE IF NOT EXISTS cliente_certificados (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
        numero_certificado TEXT,
        fecha_emision DATE,
        estado TEXT NOT NULL DEFAULT 'Pendiente',
        archivo TEXT,
        archivo_original_name TEXT,
        archivo_mime TEXT,
        emitido_por INTEGER,
        emitido_por_nombre TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Flota de vehículos de la escuela
      CREATE TABLE IF NOT EXISTS vehiculos (
        id SERIAL PRIMARY KEY,
        placa TEXT NOT NULL UNIQUE,
        marca TEXT NOT NULL,
        modelo TEXT,
        anio INTEGER,
        color TEXT,
        transmision TEXT DEFAULT 'Manual',
        estado TEXT NOT NULL DEFAULT 'Activo',
        kilometraje_actual INTEGER DEFAULT 0,
        fecha_adquisicion DATE,
        instructor_id INTEGER REFERENCES instructores(id) ON DELETE SET NULL,
        notas TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Historial de mantenimientos por vehículo
      CREATE TABLE IF NOT EXISTS vehiculo_mantenimientos (
        id SERIAL PRIMARY KEY,
        vehiculo_id INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        descripcion TEXT,
        fecha DATE NOT NULL,
        kilometraje INTEGER,
        costo NUMERIC(10,2) DEFAULT 0,
        realizado_por TEXT,
        proximo_km INTEGER,
        proximo_fecha DATE,
        registrado_por INTEGER,
        registrado_por_nombre TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Cómo se cobró cada pago, para poder cuadrar la caja en efectivo
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'Efectivo';
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS observacion TEXT;
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS registrado_por INTEGER;
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS registrado_por_nombre TEXT;
      -- Número de factura asignado la primera vez que se ve/imprime el recibo de este pago
      -- (se asigna una sola vez, con el contador de configuracion.factura_numero_actual).
      ALTER TABLE pagos ADD COLUMN IF NOT EXISTS factura_numero TEXT;

      -- Categorías de gastos administrables (antes vivían hardcodeadas en el código)
      CREATE TABLE IF NOT EXISTS categorias_gastos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Gastos operativos de la escuela (con datos fiscales para RD: RNC/NCF/ITBIS)
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        categoria TEXT NOT NULL,
        descripcion TEXT,
        monto NUMERIC(10,2) NOT NULL,
        itbis NUMERIC(10,2) DEFAULT 0,
        proveedor TEXT,
        rnc_proveedor TEXT,
        ncf TEXT,
        metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
        comprobante TEXT,
        comprobante_original_name TEXT,
        comprobante_mime TEXT,
        registrado_por INTEGER,
        registrado_por_nombre TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Arqueo/cierre de caja diario (inmutable una vez creado, solo se puede eliminar)
      CREATE TABLE IF NOT EXISTS caja_cierres (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL UNIQUE,
        monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0,
        ingresos_efectivo NUMERIC(10,2) NOT NULL DEFAULT 0,
        ingresos_otros NUMERIC(10,2) NOT NULL DEFAULT 0,
        gastos_efectivo NUMERIC(10,2) NOT NULL DEFAULT 0,
        monto_esperado NUMERIC(10,2) NOT NULL DEFAULT 0,
        monto_contado NUMERIC(10,2) NOT NULL DEFAULT 0,
        diferencia NUMERIC(10,2) NOT NULL DEFAULT 0,
        notas TEXT,
        cerrado_por INTEGER,
        cerrado_por_nombre TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Apertura de caja: un evento real (quién, cuándo, con cuánto), separado del cierre
      CREATE TABLE IF NOT EXISTS caja_aperturas (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL UNIQUE,
        monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0,
        abierto_por INTEGER,
        abierto_por_nombre TEXT,
        hora_apertura TIMESTAMP DEFAULT NOW(),
        notas TEXT
      );

      -- Configuración: se reutilizan nombre_sistema/logo_url/telefono/direccion ya existentes,
      -- se agregan los campos que faltan para el centro administrativo (Configuración v2).
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS rnc TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS whatsapp TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS correo TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS ciudad TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS redes_sociales TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS descripcion_corta TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'RD$';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS formato_moneda TEXT DEFAULT 'es-DO';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS permitir_pagos_parciales BOOLEAN DEFAULT TRUE;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS requiere_inscripcion_inicial BOOLEAN DEFAULT TRUE;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS metodos_pago_habilitados TEXT DEFAULT 'Efectivo,Transferencia,Tarjeta,Cheque';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS factura_prefijo TEXT DEFAULT 'MON';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS factura_numero_inicial INTEGER DEFAULT 1;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS factura_numero_actual INTEGER DEFAULT 1;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS factura_pie_texto TEXT DEFAULT 'Gracias por confiar en nosotros.';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS tema_color TEXT DEFAULT '#0d9488';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS tema_modo TEXT DEFAULT 'claro';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS notif_recordatorio_clases BOOLEAN DEFAULT FALSE;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS notif_avisos_pagos BOOLEAN DEFAULT FALSE;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS notif_mensajes_internos BOOLEAN DEFAULT FALSE;

      -- Página de inicio pública (portada): hero, sobre nosotros, redes y mapa
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS portada_titulo TEXT DEFAULT 'Conduciendo hacia tu futuro';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS portada_subtitulo TEXT DEFAULT 'Aprende a manejar con seguridad, confianza y excelencia.';
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS portada_video_url TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS nosotros_texto1 TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS nosotros_texto2 TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS nosotros_imagen_url TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS instagram_url TEXT;
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS mapa_embed_url TEXT;

      -- Galería de fotos/videos de la página de inicio
      CREATE TABLE IF NOT EXISTS landing_galeria (
        id SERIAL PRIMARY KEY,
        tipo TEXT NOT NULL CHECK (tipo IN ('imagen', 'video')),
        archivo TEXT NOT NULL,
        orden INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE landing_galeria ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

      -- Usuarios: nombre completo, correo y estado (para poder desactivar sin borrar)
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_completo TEXT;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo TEXT;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Activo';

      -- Cursos: desglose de horas
      ALTER TABLE cursos ADD COLUMN IF NOT EXISTS horas_teoricas INTEGER DEFAULT 0;
      ALTER TABLE cursos ADD COLUMN IF NOT EXISTS horas_practicas INTEGER DEFAULT 0;

      -- Auditoría: quién hizo qué y cuándo
      CREATE TABLE IF NOT EXISTS auditoria_log (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        usuario_nombre TEXT,
        accion TEXT NOT NULL,
        detalle TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      );

      -- Multi-sucursal: varias sedes físicas de la misma academia (punto 10 del roadmap).
      CREATE TABLE IF NOT EXISTS sucursales (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE instructores ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE gastos ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE caja_aperturas ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
      ALTER TABLE caja_cierres ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
    `);

    // Semilla de categorías de gastos (idempotente): no duplica si ya existen.
    await pool.query(`
      INSERT INTO categorias_gastos (nombre) VALUES
        ('Nómina'), ('Combustible'), ('Mantenimiento de vehículos'), ('Alquiler'),
        ('Servicios (luz/agua/internet)'), ('Suministros y papelería'),
        ('Publicidad y marketing'), ('Impuestos'), ('Otro')
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // Sede semilla: sin esto, los datos que ya existían quedarían sin sucursal asignada.
    await pool.query(`
      INSERT INTO sucursales (nombre)
      SELECT 'Sede Principal' WHERE NOT EXISTS (SELECT 1 FROM sucursales);
    `);
    await pool.query(`
      UPDATE clientes SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE instructores SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE vehiculos SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE gastos SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE caja_aperturas SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
      UPDATE caja_cierres SET sucursal_id = (SELECT id FROM sucursales ORDER BY id LIMIT 1) WHERE sucursal_id IS NULL;
    `);
    // usuarios.sucursal_id se deja NULL a propósito para las cuentas ya existentes: NULL
    // significa "ve todas las sedes" (rol global), que es el comportamiento que ya tenían
    // admin/instructor antes de que existiera el concepto de sucursal.

    // Caja: antes una sola caja por día para toda la escuela; con sedes, cada una abre/cierra
    // la suya el mismo día. Se reemplaza el UNIQUE(fecha) por UNIQUE(fecha, sucursal_id).
    await pool.query(`
      ALTER TABLE caja_aperturas DROP CONSTRAINT IF EXISTS caja_aperturas_fecha_key;
      CREATE UNIQUE INDEX IF NOT EXISTS caja_aperturas_fecha_sucursal_key ON caja_aperturas(fecha, sucursal_id);
      ALTER TABLE caja_cierres DROP CONSTRAINT IF EXISTS caja_cierres_fecha_key;
      CREATE UNIQUE INDEX IF NOT EXISTS caja_cierres_fecha_sucursal_key ON caja_cierres(fecha, sucursal_id);
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
