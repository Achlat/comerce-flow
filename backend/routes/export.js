const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { exportPDF, exportXLSX, exportProduitsXLSX } = require('../controllers/exportController');

// GET /api/export/pdf
// ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&type=entree|sortie
router.get('/pdf', authenticate, exportPDF);

// GET /api/export/xlsx
// ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&type=entree|sortie
router.get('/xlsx', authenticate, exportXLSX);

// GET /api/export/produits/xlsx
router.get('/produits/xlsx', authenticate, exportProduitsXLSX);

module.exports = router;
