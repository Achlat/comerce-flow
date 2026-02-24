const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');

/** Génère un JWT pour un utilisateur */
const generateToken = (user) =>
  jwt.sign(
    { userId: user.id, entrepriseId: user.entreprise_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

/** POST /api/auth/login */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const mot_de_passe = req.body.mot_de_passe || req.body.password;
    if (!mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Mot de passe requis' });
    }

    const users = await query(
      `SELECT u.*, e.nom AS entreprise_nom, e.actif AS entreprise_active
       FROM users u
       JOIN entreprises e ON u.entreprise_id = e.id
       WHERE u.email = ? AND u.actif = 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    if (!user.entreprise_active) {
      return res.status(403).json({ success: false, message: 'Compte entreprise désactivé' });
    }

    // Comparaison mot de passe en clair
    if (mot_de_passe !== user.mot_de_passe) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    await query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          entreprise_id: user.entreprise_id,
          entreprise_nom: user.entreprise_nom,
        },
      },
    });
  } catch (err) {
    console.error('[AUTH] login:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/auth/register — Crée une entreprise + admin */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nom_entreprise, email_entreprise, nom_admin, email_admin, mot_de_passe } = req.body;

    const [existingUser, existingEntreprise] = await Promise.all([
      query('SELECT id FROM users WHERE email = ?', [email_admin]),
      query('SELECT id FROM entreprises WHERE email = ?', [email_entreprise]),
    ]);

    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: 'Cet email administrateur est déjà utilisé' });
    }
    if (existingEntreprise.length > 0) {
      return res.status(409).json({ success: false, message: 'Cette entreprise est déjà enregistrée' });
    }

    const entrepriseResult = await query(
      'INSERT INTO entreprises (nom, email) VALUES (?, ?)',
      [nom_entreprise, email_entreprise]
    );
    const entrepriseId = entrepriseResult.insertId;

    // Mot de passe stocké en clair
    const userResult = await query(
      'INSERT INTO users (entreprise_id, nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
      [entrepriseId, nom_admin, email_admin, mot_de_passe, 'admin']
    );

    const newUser = { id: userResult.insertId, entreprise_id: entrepriseId, role: 'admin' };
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Compte entreprise créé avec succès',
      data: {
        token,
        user: {
          id: newUser.id,
          nom: nom_admin,
          email: email_admin,
          role: 'admin',
          entreprise_id: entrepriseId,
          entreprise_nom: nom_entreprise,
        },
      },
    });
  } catch (err) {
    console.error('[AUTH] register:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/auth/me */
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      nom: req.user.nom,
      email: req.user.email,
      role: req.user.role,
      entreprise_id: req.user.entreprise_id,
      entreprise_nom: req.user.entreprise_nom,
    },
  });
};

/** PUT /api/auth/change-password */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    const users = await query('SELECT mot_de_passe FROM users WHERE id = ?', [req.user.id]);
    if (ancien_mot_de_passe !== users[0].mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });
    }

    await query('UPDATE users SET mot_de_passe = ? WHERE id = ?', [nouveau_mot_de_passe, req.user.id]);

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('[AUTH] changePassword:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/auth/users — Admin crée un employé */
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nom, email, mot_de_passe, role } = req.body;
    const entrepriseId = req.user.entreprise_id;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Mot de passe stocké en clair
    const result = await query(
      'INSERT INTO users (entreprise_id, nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)',
      [entrepriseId, nom, email, mot_de_passe, role || 'employe']
    );

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { id: result.insertId, nom, email, role: role || 'employe' },
    });
  } catch (err) {
    console.error('[AUTH] createUser:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/auth/users */
const getUsers = async (req, res) => {
  try {
    const users = await query(
      `SELECT id, nom, email, role, actif, derniere_connexion, created_at
       FROM users WHERE entreprise_id = ? ORDER BY nom`,
      [req.user.entreprise_id]
    );
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('[AUTH] getUsers:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** PUT /api/auth/users/:id */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, role, actif } = req.body;

    const users = await query(
      'SELECT id FROM users WHERE id = ? AND entreprise_id = ?',
      [id, req.user.entreprise_id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    await query(
      'UPDATE users SET nom = ?, role = ?, actif = ? WHERE id = ?',
      [nom, role, actif !== undefined ? actif : 1, id]
    );

    res.json({ success: true, message: 'Utilisateur mis à jour' });
  } catch (err) {
    console.error('[AUTH] updateUser:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { login, register, getMe, changePassword, createUser, getUsers, updateUser };
