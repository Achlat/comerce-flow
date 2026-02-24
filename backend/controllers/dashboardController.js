const { query } = require('../config/database');

/** GET /api/dashboard/stats */
const getStats = async (req, res) => {
  try {
    const { entreprise_id } = req.user;

    const [
      produitsData,
      valeurStockData,
      mouvementsJour,
      alertesData,
    ] = await Promise.all([
      // Nombre total de produits actifs
      query(
        'SELECT COUNT(*) AS total FROM produits WHERE entreprise_id = ? AND actif = 1',
        [entreprise_id]
      ),
      // Valeur totale du stock (stock * prix_achat)
      query(
        `SELECT COALESCE(SUM(stock_actuel * prix_achat), 0) AS valeur_stock,
                COALESCE(SUM(stock_actuel * prix_vente), 0) AS valeur_vente
         FROM produits WHERE entreprise_id = ? AND actif = 1`,
        [entreprise_id]
      ),
      // Entrées et sorties du jour
      query(
        `SELECT
           type,
           COUNT(*) AS nb_mouvements,
           COALESCE(SUM(quantite), 0) AS total_quantite
         FROM inventaire
         WHERE entreprise_id = ? AND DATE(date_mouvement) = CURDATE()
         GROUP BY type`,
        [entreprise_id]
      ),
      // Alertes stock faible
      query(
        `SELECT id, nom, stock_actuel, stock_minimum
         FROM produits
         WHERE entreprise_id = ? AND actif = 1 AND stock_actuel <= stock_minimum
         ORDER BY stock_actuel ASC
         LIMIT 10`,
        [entreprise_id]
      ),
    ]);

    const entreesJour = mouvementsJour.find((m) => m.type === 'entree') || { nb_mouvements: 0, total_quantite: 0 };
    const sortiesJour = mouvementsJour.find((m) => m.type === 'sortie') || { nb_mouvements: 0, total_quantite: 0 };

    res.json({
      success: true,
      data: {
        nb_produits: produitsData[0].total,
        valeur_stock_achat: valeurStockData[0].valeur_stock,
        valeur_stock_vente: valeurStockData[0].valeur_vente,
        entrees_jour: {
          nb_mouvements: entreesJour.nb_mouvements,
          total_quantite: entreesJour.total_quantite,
        },
        sorties_jour: {
          nb_mouvements: sortiesJour.nb_mouvements,
          total_quantite: sortiesJour.total_quantite,
        },
        nb_alertes_stock_faible: alertesData.length,
        alertes_stock_faible: alertesData,
      },
    });
  } catch (err) {
    console.error('[DASHBOARD] getStats:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/dashboard/graphique?periode=7|30|90 */
const getGraphique = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const periode = parseInt(req.query.periode) || 30;

    // Mouvements groupés par jour sur la période
    const data = await query(
      `SELECT
         DATE(date_mouvement) AS jour,
         type,
         COALESCE(SUM(quantite), 0) AS total_quantite,
         COUNT(*) AS nb_mouvements
       FROM inventaire
       WHERE entreprise_id = ?
         AND date_mouvement >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(date_mouvement), type
       ORDER BY jour ASC`,
      [entreprise_id, periode]
    );

    // Reformater en tableau par jour avec entrees et sorties
    const mapParJour = {};
    data.forEach(({ jour, type, total_quantite, nb_mouvements }) => {
      const key = jour instanceof Date ? jour.toISOString().split('T')[0] : jour;
      if (!mapParJour[key]) {
        mapParJour[key] = { jour: key, entrees: 0, sorties: 0, nb_entrees: 0, nb_sorties: 0 };
      }
      if (type === 'entree') {
        mapParJour[key].entrees = total_quantite;
        mapParJour[key].nb_entrees = nb_mouvements;
      } else {
        mapParJour[key].sorties = total_quantite;
        mapParJour[key].nb_sorties = nb_mouvements;
      }
    });

    res.json({
      success: true,
      data: Object.values(mapParJour),
    });
  } catch (err) {
    console.error('[DASHBOARD] getGraphique:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/** GET /api/dashboard/top-produits */
const getTopProduits = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const { type = 'sortie', limite = 5 } = req.query;

    const data = await query(
      `SELECT p.id, p.nom, COALESCE(SUM(i.quantite), 0) AS total_mouvement
       FROM produits p
       LEFT JOIN inventaire i ON p.id = i.produit_id AND i.type = ?
         AND i.date_mouvement >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       WHERE p.entreprise_id = ? AND p.actif = 1
       GROUP BY p.id, p.nom
       ORDER BY total_mouvement DESC
       LIMIT ?`,
      [type, entreprise_id, parseInt(limite)]
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error('[DASHBOARD] getTopProduits:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getStats, getGraphique, getTopProduits };
