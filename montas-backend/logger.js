// Logging centralizado: los errores ya no viven solo en la consola de la terminal
// donde corre `node index.js` (se pierden al cerrarla) — quedan en montas-backend/logs/,
// rotando por tamaño para no crecer indefinidamente.
const winston = require('winston');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5 MB por archivo
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

// La consola sigue mostrando todo igual que antes (útil en desarrollo), además de quedar en archivo.
logger.add(new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), winston.format.simple())
}));

module.exports = logger;
