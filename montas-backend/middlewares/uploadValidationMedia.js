// Validación para archivos de la página de inicio (video del hero, foto de "Sobre
// Nosotros", ítems de galería) — más permisiva que uploadValidation.js (que es solo
// para documentos/fotos de cliente): admite video además de imágenes, y un límite
// mayor porque un video de portada pesa bastante más que una foto o un PDF.
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/webm'];
const MAX_MEDIA_SIZE = 40 * 1024 * 1024; // 40 MB

const mediaFileFilter = (req, file, cb) => {
  if (!ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
    return cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP, MP4 o WEBM.'));
  }
  cb(null, true);
};

module.exports = { ALLOWED_MEDIA_TYPES, MAX_MEDIA_SIZE, mediaFileFilter };
