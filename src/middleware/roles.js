// src/middleware/roles.js
// Middleware de control de acceso por roles

/**
 * Middleware factory: permite solo los roles indicados.
 * Debe usarse DESPUÉS de requireAuth.
 * @param {...string} roles - 'ADMIN' | 'OFERTANTE' | 'DEMANDANTE'
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
