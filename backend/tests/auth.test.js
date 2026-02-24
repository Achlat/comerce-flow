/**
 * Tests unitaires — Authentification
 * Run: npm test
 */

const request = require('supertest');

// Mock de la base de données pour éviter les connexions réelles
jest.mock('../config/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  beginTransaction: jest.fn(),
}));

const { query } = require('../config/database');

// Éviter le démarrage du serveur en mode test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_jwt_minimum_32_chars_ok';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'test_db';

const app = require('../server');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit créer une entreprise + admin avec données valides', async () => {
    query
      .mockResolvedValueOnce([])            // pas d'user existant
      .mockResolvedValueOnce([])            // pas d'entreprise existante
      .mockResolvedValueOnce({ insertId: 1 }) // création entreprise
      .mockResolvedValueOnce({ insertId: 1 }); // création user

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom_entreprise:   'Test Shop',
        email_entreprise: 'shop@test.com',
        nom_admin:        'Admin Test',
        email_admin:      'admin@test.com',
        mot_de_passe:     'Password123!',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('admin');
  });

  test('Doit rejeter si email admin déjà utilisé', async () => {
    query
      .mockResolvedValueOnce([{ id: 1 }]) // user existe
      .mockResolvedValueOnce([]);          // entreprise n'existe pas

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom_entreprise:   'Test Shop 2',
        email_entreprise: 'shop2@test.com',
        nom_admin:        'Admin Test',
        email_admin:      'admin@test.com',
        mot_de_passe:     'Password123!',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('Doit rejeter un mot de passe trop court', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom_entreprise:   'Test',
        email_entreprise: 'test@test.com',
        nom_admin:        'Admin',
        email_admin:      'admin@test.com',
        mot_de_passe:     '123',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('Doit rejeter un email invalide', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom_entreprise:   'Test',
        email_entreprise: 'not-an-email',
        nom_admin:        'Admin',
        email_admin:      'admin@test.com',
        mot_de_passe:     'Password123!',
      });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit retourner un token avec identifiants valides', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123!', 12);

    query
      .mockResolvedValueOnce([{
        id: 1,
        nom: 'Admin Test',
        email: 'admin@test.com',
        mot_de_passe: hash,
        role: 'admin',
        entreprise_id: 1,
        entreprise_nom: 'Test Shop',
        entreprise_active: 1,
      }])
      .mockResolvedValueOnce([]); // update derniere_connexion

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', mot_de_passe: 'Password123!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('admin');
  });

  test('Doit rejeter avec mauvais mot de passe', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('CorrectPassword!', 12);

    query.mockResolvedValueOnce([{
      id: 1,
      email: 'admin@test.com',
      mot_de_passe: hash,
      role: 'admin',
      entreprise_id: 1,
      entreprise_nom: 'Test',
      entreprise_active: 1,
    }]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', mot_de_passe: 'WrongPassword!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Doit rejeter avec email inexistant', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', mot_de_passe: 'Password123!' });

    expect(res.statusCode).toBe(401);
  });

  test('Doit rejeter si entreprise désactivée', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123!', 12);

    query.mockResolvedValueOnce([{
      id: 1,
      email: 'admin@test.com',
      mot_de_passe: hash,
      role: 'admin',
      entreprise_id: 1,
      entreprise_nom: 'Test',
      entreprise_active: 0,
    }]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', mot_de_passe: 'Password123!' });

    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  test('Doit rejeter sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('Doit rejeter avec token invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer faketoken123');
    expect(res.statusCode).toBe(401);
  });

  test('Doit retourner les infos utilisateur avec token valide', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: 1, entrepriseId: 1, role: 'admin' },
      process.env.JWT_SECRET
    );

    query.mockResolvedValueOnce([{
      id: 1,
      nom: 'Admin Test',
      email: 'admin@test.com',
      role: 'admin',
      entreprise_id: 1,
      entreprise_nom: 'Test Shop',
      entreprise_active: 1,
    }]);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('mot_de_passe');
  });
});
