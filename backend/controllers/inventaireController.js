const { validationResult } = require('express-validator');
const { query, beginTransaction } = require('../config/database');
const { logHistorique } = require('./historiqueController');

/** GET /api/inventaire */
const getMouvements = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const {
      produit_id, type, date_debut, date_fin,
      page = 1, limit = 50,
    } = req.query;

    let sql = `
      SELECT i.id, i.type, i.quantite, i.prix_unitaire,
             i.date_mouvement, i.commentaire, i.reference,
             p.id AS produit_id, p.nom AS produit_nom, p.unite AS produit_unite,
             u.nom AS user_nom,
             f.id AS fournisseur_id, f.nom AS fournisseur_nom,
             c.id AS client_id, c.nom AS client_nom
      FROM inventaire i
      JOIN produits p ON i.produit_id = p.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN fournisseurs f ON i.fournisseur_id = f.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.entreprise_id = ?`;

    const params = [entreprise_id];

    if (produit_id) { sql += ' AND i.produit_id = ?';            params.push(produit_id); }
    if (type)       { sql += ' AND i.type = ?';                  params.push(type); }
    if (date_debut) { sql += ' AND DATE(i.date_mouvement) >= ?'; params.push(date_debut); }
    if (date_fin)   { sql += ' AND DATE(i.date_mouvement) <= ?'; params.push(date_fin); }

    const countSql = `SELECT COUNT(*) AS total FROM inventaire i WHERE i.entreprise_id = ?
      ${produit_id ? ' AND i.produit_id = ?' : ''}
      ${type       ? ' AND i.type = ?' : ''}
      ${date_debut ? ' AND DATE(i.date_mouvement) >= ?' : ''}
      ${date_fin   ? ' AND DATE(i.date_mouvement) <= ?' : ''}`;
    const countResult = await query(countSql, [...params]);

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
    console.error('[INVENTAIRE] getMouvements:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/inventaire/:id */
const getMouvement = async (req, res) => {
  try {
    const { id } = req.params;
    const { entreprise_id } = req.user;

    const rows = await query(
      `SELECT i.*, p.nom AS produit_nom, u.nom AS user_nom,
              f.nom AS fournisseur_nom, c.nom AS client_nom
       FROM inventaire i
       JOIN produits p ON i.produit_id = p.id
       JOIN users u ON i.user_id = u.id
       LEFT JOIN fournisseurs f ON i.fournisseur_id = f.id
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = ? AND i.entreprise_id = ?`,
      [id, entreprise_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mouvement non trouvé' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[INVENTAIRE] getMouvement:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/inventaire/entree */
const creerEntree = async (req, res) => {
  const conn = await beginTransaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { entreprise_id, id: userId } = req.user;
    const {
      produit_id, quantite, prix_unitaire,
      fournisseur_id, date_mouvement, commentaire, reference,
    } = req.body;

    // Vérifier que le produit appartient à l'entreprise
    const [produits] = await conn.execute(
      'SELECT id, nom, stock_actuel, prix_achat FROM produits WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [produit_id, entreprise_id]
    );
    if (produits.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const produit = produits[0];
    const qte = parseInt(quantite);

    // Insérer le mouvement
    const [result] = await conn.execute(
      `INSERT INTO inventaire
         (entreprise_id, produit_id, user_id, fournisseur_id, type, quantite,
          prix_unitaire, date_mouvement, commentaire, reference)
       VALUES (?, ?, ?, ?, 'entree', ?, ?, ?, ?, ?)`,
      [
        entreprise_id, produit_id, userId,
        fournisseur_id || null, qte,
        prix_unitaire || produit.prix_achat,
        date_mouvement || new Date(),
        commentaire || null, reference || null,
      ]
    );

    // Mettre à jour le stock
    await conn.execute(
      'UPDATE produits SET stock_actuel = stock_actuel + ? WHERE id = ?',
      [qte, produit_id]
    );

    await conn.commit();
    conn.release();

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'entree_stock',
      entite_type: 'produit', entite_id: produit_id,
      description: `Entrée de ${qte} ${produit.nom} (stock: ${produit.stock_actuel} → ${produit.stock_actuel + qte})`,
      nouvelles_valeurs: { quantite: qte, prix_unitaire, reference },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Entrée enregistrée. Nouveau stock: ${produit.stock_actuel + qte}`,
      data: { id: result.insertId, nouveau_stock: produit.stock_actuel + qte },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[INVENTAIRE] creerEntree:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** POST /api/inventaire/sortie */
const creerSortie = async (req, res) => {
  const conn = await beginTransaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { entreprise_id, id: userId } = req.user;
    const {
      produit_id, quantite, prix_unitaire,
      client_id, date_mouvement, commentaire, reference,
    } = req.body;

    const [produits] = await conn.execute(
      'SELECT id, nom, stock_actuel, prix_vente FROM produits WHERE id = ? AND entreprise_id = ? AND actif = 1',
      [produit_id, entreprise_id]
    );
    if (produits.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const produit = produits[0];
    const qte = parseInt(quantite);

    if (produit.stock_actuel < qte) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant. Disponible: ${produit.stock_actuel}, demandé: ${qte}`,
      });
    }

    const [result] = await conn.execute(
      `INSERT INTO inventaire
         (entreprise_id, produit_id, user_id, client_id, type, quantite,
          prix_unitaire, date_mouvement, commentaire, reference)
       VALUES (?, ?, ?, ?, 'sortie', ?, ?, ?, ?, ?)`,
      [
        entreprise_id, produit_id, userId,
        client_id || null, qte,
        prix_unitaire || produit.prix_vente,
        date_mouvement || new Date(),
        commentaire || null, reference || null,
      ]
    );

    await conn.execute(
      'UPDATE produits SET stock_actuel = stock_actuel - ? WHERE id = ?',
      [qte, produit_id]
    );

    await conn.commit();
    conn.release();

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: 'sortie_stock',
      entite_type: 'produit', entite_id: produit_id,
      description: `Sortie de ${qte} ${produit.nom} (stock: ${produit.stock_actuel} → ${produit.stock_actuel - qte})`,
      nouvelles_valeurs: { quantite: qte, prix_unitaire, reference },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Sortie enregistrée. Nouveau stock: ${produit.stock_actuel - qte}`,
      data: { id: result.insertId, nouveau_stock: produit.stock_actuel - qte },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[INVENTAIRE] creerSortie:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** DELETE /api/inventaire/:id — Admin seulement */
const deleteMouvement = async (req, res) => {
  const conn = await beginTransaction();
  try {
    const { id } = req.params;
    const { entreprise_id, id: userId } = req.user;

    const [rows] = await conn.execute(
      'SELECT * FROM inventaire WHERE id = ? AND entreprise_id = ?',
      [id, entreprise_id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Mouvement non trouvé' });
    }

    const mouvement = rows[0];

    // Annuler l'effet sur le stock
    const delta = mouvement.type === 'entree' ? -mouvement.quantite : mouvement.quantite;
    await conn.execute(
      'UPDATE produits SET stock_actuel = stock_actuel + ? WHERE id = ?',
      [delta, mouvement.produit_id]
    );

    await conn.execute('DELETE FROM inventaire WHERE id = ?', [id]);
    await conn.commit();
    conn.release();

    await logHistorique({
      entreprise_id, user_id: userId,
      type_action: mouvement.type === 'entree' ? 'entree_stock' : 'sortie_stock',
      entite_type: 'produit', entite_id: mouvement.produit_id,
      description: `Annulation mouvement #${id} (${mouvement.type}, qté: ${mouvement.quantite})`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Mouvement annulé et stock corrigé' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[INVENTAIRE] deleteMouvement:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getMouvements, getMouvement, creerEntree, creerSortie, deleteMouvement };
