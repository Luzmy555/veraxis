exports.requireAdmin = (req, res, next) => {
  const role = (req.user && req.user.rol) || '';
  if (!['admin', 'administrador'].includes(role)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
};

// 'usuario' es el rol real que usa este sistema para las cuentas de instructor
// (no existe ninguna cuenta con rol literal 'instructor' en la base de datos).
exports.requireStaff = (req, res, next) => {
  const role = (req.user && req.user.rol) || '';
  if (!['admin', 'administrador', 'instructor', 'usuario'].includes(role)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo personal autorizado.' });
  }
  next();
};
