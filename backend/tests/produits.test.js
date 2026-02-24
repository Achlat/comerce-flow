/**
 * Tests unitaires — Produits
 */

jest.mock('../config/database', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  beginTransaction: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_jwt_minimum_32_chars_ok';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const app = require('../server');

/** Génère un token admin valide pour les tests */
const makeAdminToken = () =>
  jwt.sign({ userId: 1, entrepriseId: 1, role: 'admin' }, process.env.JWT_SECRET);

const makeEmployeToken = () =>
  jwt.sign({ userId: 2, entrepriseId: 1, role: 'employe' }, process.env.JWT_SECRET);

/** Mock utilisateur authentifié */
const mockUser = {
  id: 1, nom: 'Admin', email: 'admin@test.com', role: 'admin',
  entreprise_id: 1, entreprise_nom: 'Test Shop', entreprise_active: 1,
};

const mockEmploye = {
  id: 2, nom: 'Employe', email: 'emp@test.com', role: 'employe',
  entreprise_id: 1, entreprise_nom: 'Test Shop', entreprise_active: 1,
};

describe('GET /api/produits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Doit retourner la liste des produits', async () => {
    query
      .mockResolvedValueOnce([mockUser])     // authenticate
      .mockResolvedValueOnce([               // getProduits — count
        { total: 2 }
      ])
      .mockResolvedValueOnce([              // getProduits — data
        { id: 1, nom: 'Riz 25kg', prix_achat: 18000, prix_vente: 22000, stock_actuel: 50, stock_minimum: 10, stock_faible: 0 },
        { id: 2, nom: 'Huile 5L', prix_achat: 4500,  prix_vente: 5500,  stock_actuel: 3,  stock_minimum: 15, stock_faible: 1 },
      ]);

    const res = await request(app)
      .get('/api/produits')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('Doit rejeter sans authentification', async () => {
    const res = await request(app).get('/api/produits');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/produits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Admin peut créer un produit', async () => {
    query
      .mockResolvedValueOnce([mockUser])          // authenticate
      .mockResolvedValueOnce([])                   // vérif doublon
      .mockResolvedValueOnce({ insertId: 3 })      // INSERT produit
      .mockResolvedValueOnce([])                   // logHistorique
      .mockResolvedValueOnce([]);                  // INSERT inventaire stock initial (stock_actuel = 0 → pas exécuté)

    const res = await request(app)
      .post('/api/produits')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({
        nom: 'Farine 50kg',
        prix_achat: 12000,
        prix_vente: 15000,
        stock_minimum: 5,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  test('Employé ne peut pas créer un produit (403)', async () => {
    query.mockResolvedValueOnce([mockEmploye]); // authenticate → rôle employe

    const res = await request(app)
      .post('/api/produits')
      .set('Authorization', `Bearer ${makeEmployeToken()}`)
      .send({
        nom: 'Test',
        prix_achat: 100,
        prix_vente: 150,
      });

    expect(res.statusCode).toBe(403);
  });

  test('Doit rejeter si prix manquant', async () => {
    query.mockResolvedValueOnce([mockUser]); // authenticate

    const res = await request(app)
      .post('/api/produits')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ nom: 'Produit sans prix' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('PUT /api/produits/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Admin peut modifier un produit', async () => {
    query
      .mockResolvedValueOnce([mockUser])  // authenticate
      .mockResolvedValueOnce([{           // produit existant
        id: 1, nom: 'Riz', prix_achat: 18000, prix_vente: 22000,
        stock_minimum: 10, unite: 'sac', description: null,
        code_barre: null, categorie_id: null,
      }])
      .mockResolvedValueOnce([])          // UPDATE
      .mockResolvedValueOnce([]);         // logHistorique

    const res = await request(app)
      .put('/api/produits/1')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ prix_vente: 24000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Doit retourner 404 si produit inexistant', async () => {
    query
      .mockResolvedValueOnce([mockUser]) // authenticate
      .mockResolvedValueOnce([]);        // produit non trouvé

    const res = await request(app)
      .put('/api/produits/9999')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ prix_vente: 24000 });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/produits/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Admin peut supprimer (soft delete) un produit', async () => {
    query
      .mockResolvedValueOnce([mockUser])       // authenticate
      .mockResolvedValueOnce([{ nom: 'Riz' }]) // produit existe
      .mockResolvedValueOnce([])               // UPDATE actif=0
      .mockResolvedValueOnce([]);              // logHistorique

    const res = await request(app)
      .delete('/api/produits/1')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
