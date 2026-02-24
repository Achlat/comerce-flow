const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getHistorique, getMouvements } = require('../controllers/historiqueController');

// GET /api/historique
// ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&produit_id=X&type_action=X&page=1&limit=50
router.get('/', authenticate, getHistorique);

// GET /api/historique/mouvements
// ?date_debut=&date_fin=&produit_id=&type=entree|sortie&page=&limit=
router.get('/mouvements', authenticate, getMouvements);

module.exports = router;
