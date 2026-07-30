const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión de nuevo.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      usuario: payload.usuario,
      rol: (payload.rol || '').toString().toLowerCase(),
      sucursal_id: payload.sucursal_id ?? null
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
  }
};
