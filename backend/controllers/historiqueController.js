const { query } = require('../config/database');

/**
 * Enregistre une action dans la table historique.
 * Appelé par tous les autres controllers.
 */
const logHistorique = async ({
  entreprise_id,
  user_id,
  type_action,
  entite_type = null,
  entite_id = null,
  description,
  anciennes_valeurs = null,
  nouvelles_valeurs = null,
  ip_address = null,
}) => {
  try {
    await query(
      `INSERT INTO historique
         (entreprise_id, user_id, type_action, entite_type, entite_id,
          description, anciennes_valeurs, nouvelles_valeurs, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entreprise_id,
        user_id,
        type_action,
        entite_type,
        entite_id,
        description,
        anciennes_valeurs ? JSON.stringify(anciennes_valeurs) : null,
        nouvelles_valeurs ? JSON.stringify(nouvelles_valeurs) : null,
        ip_address,
      ]
    );
  } catch (err) {
    // Ne jamais bloquer l'opération principale si la log échoue
    console.error('[HISTORIQUE] logHistorique error:', err.message);
  }
};

/** GET /api/historique */
const getHistorique = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const {
      date_debut,
      date_fin,
      produit_id,
      type_action,
      page = 1,
      limit = 50,
    } = req.query;

    let sql = `
      SELECT h.id, h.type_action, h.entite_type, h.entite_id,
             h.description, h.anciennes_valeurs, h.nouvelles_valeurs,
             h.ip_address, h.created_at,
             u.nom AS user_nom, u.email AS user_email
      FROM historique h
      JOIN users u ON h.user_id = u.id
      WHERE h.entreprise_id = ?`;

    const params = [entreprise_id];

    if (date_debut) {
      sql += ' AND DATE(h.created_at) >= ?';
      params.push(date_debut);
    }
    if (date_fin) {
      sql += ' AND DATE(h.created_at) <= ?';
      params.push(date_fin);
    }
    if (produit_id) {
      sql += ' AND h.entite_id = ? AND h.entite_type = ?';
      params.push(produit_id, 'produit');
    }
    if (type_action) {
      sql += ' AND h.type_action = ?';
      params.push(type_action);
    }

    // Count
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM historique h WHERE h.entreprise_id = ?
       ${date_debut ? 'AND DATE(h.created_at) >= ?' : ''}
       ${date_fin ? 'AND DATE(h.created_at) <= ?' : ''}
       ${produit_id ? 'AND h.entite_id = ? AND h.entite_type = ?' : ''}
       ${type_action ? 'AND h.type_action = ?' : ''}`,
      params
    );

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const rows = await query(sql, params);

    // Parser JSON stocké
    const data = rows.map((r) => ({
      ...r,
      anciennes_valeurs: r.anciennes_valeurs ? JSON.parse(r.anciennes_valeurs) : null,
      nouvelles_valeurs: r.nouvelles_valeurs ? JSON.parse(r.nouvelles_valeurs) : null,
    }));

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
    console.error('[HISTORIQUE] getHistorique:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/historique/mouvements — Entrées + Sorties pour la timeline */
const getMouvements = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const {
      date_debut,
      date_fin,
      produit_id,
      type,
      page = 1,
      limit = 50,
    } = req.query;

    let sql = `
      SELECT i.id, i.type, i.quantite, i.prix_unitaire,
             i.date_mouvement, i.commentaire, i.reference,
             p.nom AS produit_nom, p.unite AS produit_unite,
             u.nom AS user_nom,
             f.nom AS fournisseur_nom,
             c.nom AS client_nom
      FROM inventaire i
      JOIN produits p ON i.produit_id = p.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN fournisseurs f ON i.fournisseur_id = f.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.entreprise_id = ?`;

    const params = [entreprise_id];

    if (date_debut) { sql += ' AND DATE(i.date_mouvement) >= ?'; params.push(date_debut); }
    if (date_fin)   { sql += ' AND DATE(i.date_mouvement) <= ?'; params.push(date_fin); }
    if (produit_id) { sql += ' AND i.produit_id = ?';            params.push(produit_id); }
    if (type)       { sql += ' AND i.type = ?';                  params.push(type); }

    const countParams = [...params];
    const countSql = `SELECT COUNT(*) AS total FROM inventaire i WHERE i.entreprise_id = ?
      ${date_debut ? 'AND DATE(i.date_mouvement) >= ?' : ''}
      ${date_fin   ? 'AND DATE(i.date_mouvement) <= ?' : ''}
      ${produit_id ? 'AND i.produit_id = ?' : ''}
      ${type       ? 'AND i.type = ?' : ''}`;
    const countResult = await query(countSql, countParams);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' ORDER BY i.date_mouvement DESC LIMIT ? OFFSET ?';
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
    console.error('[HISTORIQUE] getMouvements:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { logHistorique, getHistorique, getMouvements };
