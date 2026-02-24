const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { logHistorique } = require('./historiqueController');

/** GET /api/clients */
const getClients = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const { search = '', page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT id, nom, telephone, email, adresse, actif, created_at
      FROM clients
      WHERE entreprise_id = ? AND actif = 1`;
    const params = [entreprise_id];

    if (search) {
      sql += ' AND (nom LIKE ? OR telephone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM clients WHERE entreprise_id = ? AND actif = 1
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
    console.error('[CLIENTS] getClients:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/clients/:id */
const getClient = async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM clients WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [req.params.id, req.user.entreprise_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CLIENTS] getClient:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/clients */
const createClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { entreprise_id, id: userId } = req.user;
    const { nom, telephone, email, adresse } = req.body;

    const result = await query(
      'INSERT INTO clients (entreprise_id, nom, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)',
      [entreprise_id, nom, telephone || null, email || null, adresse || null]
    );

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'creation_client',
      entite_type: 'client', entite_id: result.insertId,
      description: `Création du client "${nom}"`,
      nouvelles_valeurs: { nom, telephone, email, adresse },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('[CLIENTS] createClient:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** PUT /api/clients/:id */
const updateClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;
    const { nom, telephone, email, adresse } = req.body;

    const anciens = await query(
      'SELECT * FROM clients WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (anciens.length === 0) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    const a = anciens[0];
    await query(
      'UPDATE clients SET nom = ?, telephone = ?, email = ?, adresse = ? WHERE id = ?',
      [nom ?? a.nom, telephone ?? a.telephone, email ?? a.email, adresse ?? a.adresse, id]
    );

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'modification_client',
      entite_type: 'client', entite_id: parseInt(id),
      description: `Modification du client "${a.nom}"`,
      anciennes_valeurs: { nom: a.nom, telephone: a.telephone, email: a.email, adresse: a.adresse },
      nouvelles_valeurs: { nom, telephone, email, adresse },
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Client mis à jour' });
  } catch (err) {
    console.error('[CLIENTS] updateClient:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** DELETE /api/clients/:id */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;

    const rows = await query(
      'SELECT nom FROM clients WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    await query('UPDATE clients SET actif = 0 WHERE id = ?', [id]);

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'suppression_client',
      entite_type: 'client', entite_id: parseInt(id),
      description: `Suppression du client "${rows[0].nom}"`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Client supprimé' });
  } catch (err) {
    console.error('[CLIENTS] deleteClient:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
