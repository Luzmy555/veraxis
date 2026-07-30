// Respaldo local de montas-backend/uploads/ (fotos de clientes, documentos, certificados,
// comprobantes de gastos, config/branding) con rotación — la base de datos ya vive en un
// Postgres administrado (Neon), pero estos archivos solo existen en este disco.
//
// Uso manual:   node scripts/backupUploads.js
// Programado:   agregar esta línea a una tarea programada (Windows Task Scheduler) o a
//               un cron job diario en el servidor de producción, ej.:
//               0 3 * * * cd /ruta/al/proyecto/montas-backend && node scripts/backupUploads.js

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BACKUPS_DIR = path.join(__dirname, '..', 'backups', 'uploads');
const RETENCION_CANTIDAD = 7; // cuántas corridas de respaldo recientes conservar (pensado para 1 corrida/día = 7 días)

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function respaldar() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('❌ No existe la carpeta uploads/, nada que respaldar.');
    process.exit(1);
  }
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const destino = path.join(BACKUPS_DIR, `uploads-${timestamp()}`);
  fs.cpSync(UPLOADS_DIR, destino, { recursive: true });
  console.log(`✅ Respaldo creado en ${destino}`);

  const existentes = fs.readdirSync(BACKUPS_DIR)
    .filter((nombre) => nombre.startsWith('uploads-'))
    .map((nombre) => ({ nombre, ruta: path.join(BACKUPS_DIR, nombre), mtime: fs.statSync(path.join(BACKUPS_DIR, nombre)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const aBorrar = existentes.slice(RETENCION_CANTIDAD);
  for (const viejo of aBorrar) {
    fs.rmSync(viejo.ruta, { recursive: true, force: true });
    console.log(`🗑️  Respaldo antiguo eliminado: ${viejo.nombre}`);
  }

  console.log(`ℹ️  Quedan ${Math.min(existentes.length, RETENCION_CANTIDAD)} respaldo(s) (retención: ${RETENCION_CANTIDAD}).`);
}

respaldar();
