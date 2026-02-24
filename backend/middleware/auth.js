const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware d'authentification JWT
 * Vérifie le token, charge l'utilisateur et son entreprise dans req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification manquant",
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expiré, veuillez vous reconnecter' });
      }
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const users = await query(
      `SELECT u.id, u.nom, u.email, u.role, u.entreprise_id, u.actif,
              e.nom AS entreprise_nom, e.actif AS entreprise_active
       FROM users u
       JOIN entreprises e ON u.entreprise_id = e.id
       WHERE u.id = ? AND u.actif = 1`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé ou désactivé' });
    }

    const user = users[0];
    if (!user.entreprise_active) {
      return res.status(403).json({ success: false, message: 'Compte entreprise désactivé' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'authentification' });
  }
};

module.exports = { authenticate };
