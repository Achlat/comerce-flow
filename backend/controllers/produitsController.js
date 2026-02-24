const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { logHistorique } = require('./historiqueController');

/** GET /api/produits */
const getProduits = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const {
      search = '',
      categorie_id,
      stock_faible,
      page = 1,
      limit = 50,
      ordre = 'nom',
      direction = 'ASC',
    } = req.query;

    const colonnesAutorisees = ['nom', 'prix_achat', 'prix_vente', 'stock_actuel', 'created_at'];
    const col = colonnesAutorisees.includes(ordre) ? ordre : 'nom';
    const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let sql = `
      SELECT p.id, p.nom, p.code_barre, p.prix_achat, p.prix_vente,
             p.stock_actuel, p.stock_minimum, p.unite, p.description,
             p.actif, p.created_at, p.updated_at,
             c.id AS categorie_id, c.nom AS categorie_nom,
             (p.stock_actuel <= p.stock_minimum) AS stock_faible
      FROM produits p
      LEFT JOIN categories c ON p.categorie_id = c.id
      WHERE p.entreprise_id = ? AND p.actif = 1`;

    const params = [entreprise_id];

    if (search) {
      sql += ' AND (p.nom LIKE ? OR p.code_barre LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categorie_id) {
      sql += ' AND p.categorie_id = ?';
      params.push(categorie_id);
    }
    if (stock_faible === 'true') {
      sql += ' AND p.stock_actuel <= p.stock_minimum';
    }

    // Count total
    const countSql = sql.replace(
      /SELECT p\.id.*FROM produits/s,
      'SELECT COUNT(*) AS total FROM produits'
    );
    const countResult = await query(countSql.split('ORDER BY')[0], params);
    const total = countResult[0].total;

    // Paginer
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` ORDER BY p.${col} ${dir} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const produits = await query(sql, params);

    res.json({
      success: true,
      data: produits,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[PRODUITS] getProduits:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/produits/:id */
const getProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const { entreprise_id } = req.user;

    const produits = await query(
      `SELECT p.*, c.nom AS categorie_nom
       FROM produits p
       LEFT JOIN categories c ON p.categorie_id = c.id
       WHERE p.id = ? AND p.entreprise_id = ?`,
      [id, entreprise_id]
    );

    if (produits.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, data: produits[0] });
  } catch (err) {
    console.error('[PRODUITS] getProduit:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/produits */
const createProduit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { entreprise_id, id: userId } = req.user;
    const {
      nom, categorie_id, code_barre, prix_achat, prix_vente,
      stock_actuel = 0, stock_minimum = 5, unite = 'unité', description,
    } = req.body;

    // Vérifier doublon nom dans cette entreprise
    const existing = await query(
      'SELECT id FROM produits WHERE nom = ? AND entreprise_id = ? AND actif = 1',
      [nom, entreprise_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Un produit avec ce nom existe déjà' });
    }

    const result = await query(
      `INSERT INTO produits
         (entreprise_id, nom, categorie_id, code_barre, prix_achat, prix_vente,
          stock_actuel, stock_minimum, unite, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entreprise_id, nom, categorie_id || null, code_barre || null,
       prix_achat, prix_vente, stock_actuel, stock_minimum, unite, description || null]
    );

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'creation_produit',
      entite_type: 'produit', entite_id: result.insertId,
      description: `Création du produit "${nom}"`,
      nouvelles_valeurs: { nom, prix_achat, prix_vente, stock_actuel },
      ip_address: req.ip,
    });

    // Si stock initial > 0, enregistrer un mouvement d'entrée
    if (parseInt(stock_actuel) > 0) {
      await query(
        `INSERT INTO inventaire
           (entreprise_id, produit_id, user_id, type, quantite, prix_unitaire, commentaire)
         VALUES (?, ?, ?, 'entree', ?, ?, ?)`,
        [entreprise_id, result.insertId, userId, stock_actuel, prix_achat, 'Stock initial']
      );
    }

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('[PRODUITS] createProduit:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** PUT /api/produits/:id */
const updateProduit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;

    const anciens = await query(
      'SELECT * FROM produits WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (anciens.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const ancien = anciens[0];
    const {
      nom, categorie_id, code_barre, prix_achat, prix_vente,
      stock_minimum, unite, description,
    } = req.body;

    await query(
      `UPDATE produits
       SET nom = ?, categorie_id = ?, code_barre = ?, prix_achat = ?, prix_vente = ?,
           stock_minimum = ?, unite = ?, description = ?
       WHERE id = ? AND entreprise_id = ?`,
      [
        nom ?? ancien.nom,
        categorie_id !== undefined ? categorie_id : ancien.categorie_id,
        code_barre !== undefined ? code_barre : ancien.code_barre,
        prix_achat ?? ancien.prix_achat,
        prix_vente ?? ancien.prix_vente,
        stock_minimum ?? ancien.stock_minimum,
        unite ?? ancien.unite,
        description !== undefined ? description : ancien.description,
        id, entreprise_id,
      ]
    );

    // Détecter modification de prix pour l'historique
    const typeAction =
      (prix_achat !== undefined && parseFloat(prix_achat) !== parseFloat(ancien.prix_achat)) ||
      (prix_vente !== undefined && parseFloat(prix_vente) !== parseFloat(ancien.prix_vente))
        ? 'modification_prix'
        : 'modification_produit';

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: typeAction,
      entite_type: 'produit', entite_id: parseInt(id),
      description: `Modification du produit "${ancien.nom}"`,
      anciennes_valeurs: {
        nom: ancien.nom, prix_achat: ancien.prix_achat,
        prix_vente: ancien.prix_vente, stock_minimum: ancien.stock_minimum,
      },
      nouvelles_valeurs: { nom, prix_achat, prix_vente, stock_minimum },
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Produit mis à jour avec succès' });
  } catch (err) {
    console.error('[PRODUITS] updateProduit:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** DELETE /api/produits/:id */
const deleteProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;

    const produits = await query(
      'SELECT nom FROM produits WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [id, entreprise_id]
    );
    if (produits.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    // Soft delete
    await query('UPDATE produits SET actif = 0 WHERE id = ?', [id]);

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'suppression_produit',
      entite_type: 'produit', entite_id: parseInt(id),
      description: `Suppression du produit "${produits[0].nom}"`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Produit supprimé avec succès' });
  } catch (err) {
    console.error('[PRODUITS] deleteProduit:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/produits/categories */
const getCategories = async (req, res) => {
  try {
    const categories = await query(
      'SELECT * FROM categories WHERE entreprise_id = ? ORDER BY nom',
      [req.user.entreprise_id]
    );
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[PRODUITS] getCategories:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/produits/categories */
const createCategorie = async (req, res) => {
  try {
    const { nom, description } = req.body;
    if (!nom) {
      return res.status(400).json({ success: false, message: 'Le nom de la catégorie est requis' });
    }
    const result = await query(
      'INSERT INTO categories (entreprise_id, nom, description) VALUES (?, ?, ?)',
      [req.user.entreprise_id, nom, description || null]
    );
    res.status(201).json({
      success: true,
      message: 'Catégorie créée',
      data: { id: result.insertId, nom },
    });
  } catch (err) {
    console.error('[PRODUITS] createCategorie:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getProduits, getProduit, createProduit, updateProduit, deleteProduit,
  getCategories, createCategorie,
};
