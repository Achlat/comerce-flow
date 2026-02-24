const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  getClients, getClient, createClient, updateClient, deleteClient,
} = require('../controllers/clientsController');

const clientValidators = [
  body('nom').trim().notEmpty().withMessage('Nom du client requis'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide').normalizeEmail(),
  body('telephone').optional().trim(),
  body('adresse').optional().trim(),
];

// GET  /api/clients
router.get('/', authenticate, getClients);

// GET  /api/clients/:id
router.get('/:id', authenticate, getClient);

// POST /api/clients  (admin)
router.post('/', authenticate, requireAdmin, clientValidators, createClient);

// PUT  /api/clients/:id  (admin)
router.put('/:id', authenticate, requireAdmin, clientValidators, updateClient);

// DELETE /api/clients/:id  (admin)
router.delete('/:id', authenticate, requireAdmin, deleteClient);

module.exports = router;
