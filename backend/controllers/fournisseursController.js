const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { logHistorique } = require('./historiqueController');

/** GET /api/fournisseurs */
const getFournisseurs = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const { search = '', page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT id, nom, telephone, email, adresse, actif, created_at
      FROM fournisseurs
      WHERE entreprise_id = ? AND actif = 1`;
    const params = [entreprise_id];

    if (search) {
      sql += ' AND (nom LIKE ? OR telephone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM fournisseurs WHERE entreprise_id = ? AND actif = 1
       ${search ? 'AND (nom LIKE ? OR telephone LIKE ? OR email LIKE ?)' : ''}`,
      search ? [entreprise_id, `%${search}%`, `%${search}%`, `%${search}%`] : [entreprise_id]
    );

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' ORDER BY nom ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const data = await query(sql, params);

    res.json({
      success: true,
      data,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[FOURNISSEURS] getFournisseurs:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/fournisseurs/:id */
const getFournisseur = async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM fournisseurs WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [req.params.id, req.user.entreprise_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[FOURNISSEURS] getFournisseur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/fournisseurs */
const createFournisseur = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { entreprise_id, id: userId } = req.user;
    const { nom, telephone, email, adresse } = req.body;

    const result = await query(
      'INSERT INTO fournisseurs (entreprise_id, nom, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)',
      [entreprise_id, nom, telephone || null, email || null, adresse || null]
    );

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'creation_fournisseur',
      entite_type: 'fournisseur', entite_id: result.insertId,
      description: `Création du fournisseur "${nom}"`,
      nouvelles_valeurs: { nom, telephone, email, adresse },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Fournisseur créé avec succès',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('[FOURNISSEURS] createFournisseur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** PUT /api/fournisseurs/:id */
const updateFournisseur = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;
    const { nom, telephone, email, adresse } = req.body;

    const anciens = await query(
      'SELECT * FROM fournisseurs WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (anciens.length === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    const a = anciens[0];
    await query(
      'UPDATE fournisseurs SET nom = ?, telephone = ?, email = ?, adresse = ? WHERE id = ?',
      [nom ?? a.nom, telephone ?? a.telephone, email ?? a.email, adresse ?? a.adresse, id]
    );

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'modification_fournisseur',
      entite_type: 'fournisseur', entite_id: parseInt(id),
      description: `Modification du fournisseur "${a.nom}"`,
      anciennes_valeurs: { nom: a.nom, telephone: a.telephone, email: a.email, adresse: a.adresse },
      nouvelles_valeurs: { nom, telephone, email, adresse },
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Fournisseur mis à jour' });
  } catch (err) {
    console.error('[FOURNISSEURS] updateFournisseur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** DELETE /api/fournisseurs/:id */
const deleteFournisseur = async (req, res) => {
  try {
    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;

    const rows = await query(
      'SELECT nom FROM fournisseurs WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    await query('UPDATE fournisseurs SET actif = 0 WHERE id = ?', [id]);

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'suppression_fournisseur',
      entite_type: 'fournisseur', entite_id: parseInt(id),
      description: `Suppression du fournisseur "${rows[0].nom}"`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (err) {
    console.error('[FOURNISSEURS] deleteFournisseur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getFournisseurs, getFournisseur, createFournisseur, updateFournisseur, deleteFournisseur };
