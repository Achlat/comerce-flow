/**
 * Middleware de permissions basé sur les rôles
 */

/**
 * Réservé aux administrateurs uniquement
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs',
    });
  }
  next();
};

/**
 * Accessible aux admins et employés
 */
const requireEmployeOrAdmin = (req, res, next) => {
  if (!['admin', 'employe'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé',
    });
  }
  next();
};

/**
 * Vérifie que l'utilisateur appartient bien à l'entreprise ciblée
 * (protection supplémentaire pour SaaS multi-tenant)
 */
const requireSameEntreprise = (paramName = 'entreprise_id') => (req, res, next) => {
  const targetId = parseInt(req.params[paramName] || req.body[paramName]);
  if (targetId && targetId !== req.user.entreprise_id) {
    return res.status(403).json({
      success: false,
      message: 'Accès aux données d\'une autre entreprise refusé',
    });
  }
  next();
};

module.exports = { requireAdmin, requireEmployeOrAdmin, requireSameEntreprise };
