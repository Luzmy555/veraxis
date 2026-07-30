const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP o PDF.'));
  }
  cb(null, true);
};

module.exports = { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, fileFilter };
