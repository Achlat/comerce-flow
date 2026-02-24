const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  getFournisseurs, getFournisseur, createFournisseur, updateFournisseur, deleteFournisseur,
} = require('../controllers/fournisseursController');

const fournisseurValidators = [
  body('nom').trim().notEmpty().withMessage('Nom du fournisseur requis'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide').normalizeEmail(),
  body('telephone').optional().trim(),
  body('adresse').optional().trim(),
];

// GET  /api/fournisseurs
router.get('/', authenticate, getFournisseurs);

// GET  /api/fournisseurs/:id
router.get('/:id', authenticate, getFournisseur);

// POST /api/fournisseurs  (admin)
router.post('/', authenticate, requireAdmin, fournisseurValidators, createFournisseur);

// PUT  /api/fournisseurs/:id  (admin)
router.put('/:id', authenticate, requireAdmin, fournisseurValidators, updateFournisseur);

// DELETE /api/fournisseurs/:id  (admin)
router.delete('/:id', authenticate, requireAdmin, deleteFournisseur);

module.exports = router;
