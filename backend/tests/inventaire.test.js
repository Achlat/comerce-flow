/**
 * Tests unitaires — Inventaire (Entrées / Sorties)
 */

jest.mock('../config/database', () => {
  const mockConn = {
    execute:     jest.fn(),
    commit:      jest.fn().mockResolvedValue(true),
    rollback:    jest.fn().mockResolvedValue(true),
    release:     jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(true),
  };
  return {
    query:            jest.fn(),
    testConnection:   jest.fn().mockResolvedValue(true),
    beginTransaction: jest.fn().mockResolvedValue(mockConn),
    _mockConn:        mockConn,
  };
});

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_jwt_minimum_32_chars_ok';

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const { query, beginTransaction, _mockConn } = require('../config/database');
const app      = require('../server');

const mockAdmin = {
  id: 1, nom: 'Admin', email: 'admin@test.com', role: 'admin',
  entreprise_id: 1, entreprise_nom: 'Test Shop', entreprise_active: 1,
};

const adminToken = jwt.sign(
  { userId: 1, entrepriseId: 1, role: 'admin' },
  process.env.JWT_SECRET
);

describe('POST /api/inventaire/entree', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit enregistrer une entrée et mettre à jour le stock', async () => {
    query.mockResolvedValueOnce([mockAdmin]); // authenticate

    _mockConn.execute
      .mockResolvedValueOnce([[{             // SELECT produit
        id: 1, nom: 'Riz 25kg', stock_actuel: 50, prix_achat: 18000,
      }]])
      .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT inventaire
      .mockResolvedValueOnce([[]]);              // UPDATE stock

    // logHistorique (query)
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/inventaire/entree')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        produit_id:    1,
        quantite:      20,
        prix_unitaire: 18000,
        commentaire:   'Livraison fournisseur',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('nouveau_stock', 70);
  });

  test('Doit rejeter si produit non trouvé', async () => {
    query.mockResolvedValueOnce([mockAdmin]); // authenticate

    _mockConn.execute.mockResolvedValueOnce([[]]); // produit vide

    const res = await request(app)
      .post('/api/inventaire/entree')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ produit_id: 9999, quantite: 10 });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('Doit rejeter si quantité manquante', async () => {
    query.mockResolvedValueOnce([mockAdmin]); // authenticate

    const res = await request(app)
      .post('/api/inventaire/entree')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ produit_id: 1 }); // pas de quantite

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/inventaire/sortie', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit enregistrer une sortie et décrémenter le stock', async () => {
    query.mockResolvedValueOnce([mockAdmin]); // authenticate

    _mockConn.execute
      .mockResolvedValueOnce([[{
        id: 1, nom: 'Riz 25kg', stock_actuel: 50, prix_vente: 22000,
      }]])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([[]]);

    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/inventaire/sortie')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ produit_id: 1, quantite: 5 });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('nouveau_stock', 45);
  });

  test('Doit rejeter si stock insuffisant', async () => {
    query.mockResolvedValueOnce([mockAdmin]); // authenticate

    _mockConn.execute.mockResolvedValueOnce([[{
      id: 1, nom: 'Riz 25kg', stock_actuel: 2, prix_vente: 22000,
    }]]);

    const res = await request(app)
      .post('/api/inventaire/sortie')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ produit_id: 1, quantite: 10 }); // demande 10, stock=2

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/stock insuffisant/i);
  });
});

describe('GET /api/inventaire', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit retourner les mouvements paginés', async () => {
    query
      .mockResolvedValueOnce([mockAdmin]) // authenticate
      .mockResolvedValueOnce([{ total: 1 }]) // count
      .mockResolvedValueOnce([{              // data
        id: 1, type: 'entree', quantite: 20, produit_nom: 'Riz 25kg',
        user_nom: 'Admin', date_mouvement: new Date(),
      }]);

    const res = await request(app)
      .get('/api/inventaire')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});
