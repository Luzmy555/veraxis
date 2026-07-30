// Único lugar donde vive la URL base del backend. En desarrollo local (Live Server
// en :5500/:5501) apunta al backend en :4000. Fuera de localhost (dominio propio,
// túnel de ngrok, etc.) asume que el backend sirve también el frontend en el mismo
// origen (ver montas-backend/index.js), así que usa la URL actual sin puerto fijo.
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:4000'
  : `${location.protocol}//${location.host}`;
