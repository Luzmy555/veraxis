exports.requireAdmin = (req, res, next) => {
  const role = (req.headers['x-user-role'] || '').toString().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
};
