const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  getMouvements, getMouvement, creerEntree, creerSortie, deleteMouvement,
} = require('../controllers/inventaireController');

const mouvementValidators = [
  body('produit_id').isInt({ min: 1 }).withMessage('Produit requis'),
  body('quantite').isInt({ min: 1 }).withMessage('Quantité doit être >= 1'),
  body('prix_unitaire').optional().isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('date_mouvement').optional().isISO8601().withMessage('Date invalide (format ISO8601)'),
];

// GET  /api/inventaire
router.get('/', authenticate, getMouvements);

// GET  /api/inventaire/:id
router.get('/:id', authenticate, getMouvement);

// POST /api/inventaire/entree
router.post('/entree', authenticate, mouvementValidators, creerEntree);

// POST /api/inventaire/sortie
router.post('/sortie', authenticate, mouvementValidators, creerSortie);

// DELETE /api/inventaire/:id  (admin seulement — annule le mouvement)
router.delete('/:id', authenticate, requireAdmin, deleteMouvement);

module.exports = router;
