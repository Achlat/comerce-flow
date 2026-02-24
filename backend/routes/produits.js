const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  getProduits, getProduit, createProduit, updateProduit, deleteProduit,
  getCategories, createCategorie,
} = require('../controllers/produitsController');

const produitValidators = [
  body('nom').trim().notEmpty().withMessage('Le nom du produit est requis'),
  body('prix_achat').isFloat({ min: 0 }).withMessage('Prix achat invalide'),
  body('prix_vente').isFloat({ min: 0 }).withMessage('Prix vente invalide'),
  body('stock_minimum').optional().isInt({ min: 0 }).withMessage('Stock minimum invalide'),
];

// GET  /api/produits
router.get('/', authenticate, getProduits);

// GET  /api/produits/categories
router.get('/categories', authenticate, getCategories);

// POST /api/produits/categories  (admin)
router.post('/categories', authenticate, requireAdmin, createCategorie);

// GET  /api/produits/:id
router.get('/:id', authenticate, getProduit);

// POST /api/produits  (admin)
router.post('/', authenticate, requireAdmin, produitValidators, createProduit);

// PUT  /api/produits/:id  (admin)
router.put('/:id', authenticate, requireAdmin, [
  body('nom').optional().trim().notEmpty().withMessage('Nom invalide'),
  body('prix_achat').optional().isFloat({ min: 0 }).withMessage('Prix achat invalide'),
  body('prix_vente').optional().isFloat({ min: 0 }).withMessage('Prix vente invalide'),
], updateProduit);

// DELETE /api/produits/:id  (admin)
router.delete('/:id', authenticate, requireAdmin, deleteProduit);

module.exports = router;
