const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  login, register, getMe, updateProfile, updateEntreprise, changePassword,
  createUser, getUsers, updateUser,
} = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
], login);

// POST /api/auth/register
router.post('/register', [
  body('nom_entreprise').trim().notEmpty().withMessage('Nom entreprise requis'),
  body('email_entreprise').isEmail().withMessage('Email entreprise invalide').normalizeEmail(),
  body('nom_admin').trim().notEmpty().withMessage('Nom administrateur requis'),
  body('email_admin').isEmail().withMessage('Email admin invalide').normalizeEmail(),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères'),
], register);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile
router.put('/profile', authenticate, [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
], updateProfile);

// PUT /api/auth/entreprise  (admin)
router.put('/entreprise', authenticate, requireAdmin, [
  body('nom').trim().notEmpty().withMessage('Nom entreprise requis'),
  body('devise').optional().trim(),
], updateEntreprise);

// PUT /api/auth/change-password
router.put('/change-password', authenticate, [
  body('ancien_mot_de_passe').notEmpty().withMessage('Ancien mot de passe requis'),
  body('nouveau_mot_de_passe').isLength({ min: 8 }).withMessage('Nouveau mot de passe minimum 8 caractères'),
], changePassword);

// GET /api/auth/users  (admin)
router.get('/users', authenticate, requireAdmin, getUsers);

// POST /api/auth/users  (admin crée un employé)
router.post('/users', authenticate, requireAdmin, [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères'),
  body('role').optional().isIn(['admin', 'employe']).withMessage('Rôle invalide'),
], createUser);

// PUT /api/auth/users/:id  (admin)
router.put('/users/:id', authenticate, requireAdmin, updateUser);

module.exports = router;
