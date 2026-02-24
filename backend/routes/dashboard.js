const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getStats, getGraphique, getTopProduits } = require('../controllers/dashboardController');

// GET /api/dashboard/stats
router.get('/stats', authenticate, getStats);

// GET /api/dashboard/graphique?periode=7|30|90
router.get('/graphique', authenticate, getGraphique);

// GET /api/dashboard/top-produits?type=sortie&limite=5
router.get('/top-produits', authenticate, getTopProduits);

module.exports = router;
