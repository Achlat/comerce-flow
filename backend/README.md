# Backend SaaS — Gestion Commerciale Alimentation Générale

Backend Node.js + Express + MySQL pour application SaaS multi-entreprises.
Prêt pour la production. Correspond exactement aux fonctionnalités du frontend décrit.

---

## Stack technique

| Composant       | Technologie                   |
|-----------------|-------------------------------|
| Runtime         | Node.js 18+                   |
| Framework       | Express 4.x                   |
| Base de données | MySQL 5.7+ / MariaDB 10.3+    |
| Auth            | JWT + bcryptjs                |
| Validation      | express-validator             |
| Sécurité        | helmet, express-rate-limit    |
| Export PDF      | pdfkit                        |
| Export Excel    | xlsx                          |
| Tests           | Jest + supertest              |

---

## Structure du projet

```
backend-saas/
├── config/
│   └── database.js          # Pool MySQL, helpers query/transaction
├── controllers/
│   ├── authController.js    # Login, register, gestion users
│   ├── dashboardController.js
│   ├── produitsController.js
│   ├── inventaireController.js
│   ├── fournisseursController.js
│   ├── clientsController.js
│   ├── historiqueController.js  # + logHistorique() partagé
│   └── exportController.js  # PDF + XLSX
├── middleware/
│   ├── auth.js              # Vérification JWT
│   └── permissions.js       # requireAdmin, requireEmployeOrAdmin
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── produits.js
│   ├── inventaire.js
│   ├── fournisseurs.js
│   ├── clients.js
│   ├── historique.js
│   └── export.js
├── sql/
│   └── schema.sql           # Tables, index, données démo
├── tests/
│   ├── auth.test.js
│   ├── produits.test.js
│   └── inventaire.test.js
├── .env.example
├── package.json
└── server.js
```

---

## Installation

### 1. Prérequis
- Node.js 18 ou supérieur
- MySQL 5.7+ ou MariaDB 10.3+
- phpMyAdmin (optionnel)

### 2. Cloner et installer
```bash
cd backend-saas
npm install
```

### 3. Configuration
```bash
cp .env.example .env
# Éditer .env avec vos paramètres MySQL et JWT
```

### 4. Base de données

**Via phpMyAdmin :**
1. Créer une base vide `saas_gestion_commerciale`
2. Aller dans l'onglet **SQL**
3. Coller le contenu de `sql/schema.sql`
4. Cliquer **Exécuter**

**Via ligne de commande :**
```bash
mysql -u root -p < sql/schema.sql
```

### 5. Démarrer

```bash
# Développement (avec rechargement automatique)
npm run dev

# Production
npm start
```

Le serveur démarre sur `http://localhost:3000`

---

## Compte démo (après import schema.sql)

| Rôle    | Email                      | Mot de passe  |
|---------|----------------------------|---------------|
| Admin   | admin@diallo-shop.com      | Admin1234!    |
| Employé | employe@diallo-shop.com    | Admin1234!    |

---

## API Endpoints

### Authentification

| Méthode | Endpoint                    | Description                  | Auth  |
|---------|-----------------------------|------------------------------|-------|
| POST    | /api/auth/register          | Créer entreprise + admin     | Non   |
| POST    | /api/auth/login             | Connexion                    | Non   |
| GET     | /api/auth/me                | Profil utilisateur           | Oui   |
| PUT     | /api/auth/change-password   | Changer mot de passe         | Oui   |
| GET     | /api/auth/users             | Lister utilisateurs          | Admin |
| POST    | /api/auth/users             | Créer un employé             | Admin |
| PUT     | /api/auth/users/:id         | Modifier utilisateur         | Admin |

### Dashboard

| Méthode | Endpoint                        | Description                    | Auth |
|---------|---------------------------------|--------------------------------|------|
| GET     | /api/dashboard/stats            | Statistiques principales       | Oui  |
| GET     | /api/dashboard/graphique        | Données graphique entrées/sort | Oui  |
| GET     | /api/dashboard/top-produits     | Top produits (30j)             | Oui  |

**Paramètre graphique :** `?periode=7` ou `30` ou `90`

### Produits

| Méthode | Endpoint                    | Description              | Auth  |
|---------|-----------------------------|--------------------------|-------|
| GET     | /api/produits               | Liste avec filtres       | Oui   |
| GET     | /api/produits/:id           | Détail produit           | Oui   |
| POST    | /api/produits               | Créer produit            | Admin |
| PUT     | /api/produits/:id           | Modifier produit         | Admin |
| DELETE  | /api/produits/:id           | Supprimer (soft delete)  | Admin |
| GET     | /api/produits/categories    | Liste catégories         | Oui   |
| POST    | /api/produits/categories    | Créer catégorie          | Admin |

**Filtres GET /produits :** `?search=riz&categorie_id=1&stock_faible=true&page=1&limit=50&ordre=nom&direction=ASC`

### Inventaire

| Méthode | Endpoint                  | Description                         | Auth  |
|---------|---------------------------|-------------------------------------|-------|
| GET     | /api/inventaire           | Liste mouvements avec filtres       | Oui   |
| GET     | /api/inventaire/:id       | Détail mouvement                    | Oui   |
| POST    | /api/inventaire/entree    | Enregistrer entrée de stock         | Oui   |
| POST    | /api/inventaire/sortie    | Enregistrer sortie de stock         | Oui   |
| DELETE  | /api/inventaire/:id       | Annuler mouvement (corrige stock)   | Admin |

**Body entrée/sortie :**
```json
{
  "produit_id": 1,
  "quantite": 20,
  "prix_unitaire": 18000,
  "fournisseur_id": 1,
  "date_mouvement": "2024-01-15T10:00:00Z",
  "commentaire": "Livraison hebdomadaire",
  "reference": "BON-2024-001"
}
```

### Fournisseurs

| Méthode | Endpoint                  | Auth  |
|---------|---------------------------|-------|
| GET     | /api/fournisseurs         | Oui   |
| GET     | /api/fournisseurs/:id     | Oui   |
| POST    | /api/fournisseurs         | Admin |
| PUT     | /api/fournisseurs/:id     | Admin |
| DELETE  | /api/fournisseurs/:id     | Admin |

### Clients

| Méthode | Endpoint              | Auth  |
|---------|-----------------------|-------|
| GET     | /api/clients          | Oui   |
| GET     | /api/clients/:id      | Oui   |
| POST    | /api/clients          | Admin |
| PUT     | /api/clients/:id      | Admin |
| DELETE  | /api/clients/:id      | Admin |

### Historique

| Méthode | Endpoint                      | Description               | Auth |
|---------|-------------------------------|---------------------------|------|
| GET     | /api/historique               | Audit trail complet       | Oui  |
| GET     | /api/historique/mouvements    | Timeline entrées/sorties  | Oui  |

**Filtres :** `?date_debut=2024-01-01&date_fin=2024-01-31&produit_id=1&type_action=modification_prix`

### Export

| Méthode | Endpoint                      | Description                   | Auth |
|---------|-------------------------------|-------------------------------|------|
| GET     | /api/export/pdf               | Export PDF mouvements         | Oui  |
| GET     | /api/export/xlsx              | Export Excel mouvements       | Oui  |
| GET     | /api/export/produits/xlsx     | Export Excel catalogue        | Oui  |

**Paramètres :** `?date_debut=2024-01-01&date_fin=2024-01-31&type=entree`

---

## Sécurité

- Isolation multi-tenant : chaque requête est filtrée par `entreprise_id` du token JWT
- Bcrypt (facteur 12) pour les mots de passe
- JWT signé avec secret configurable, expiration 24h
- Rate limiting : 200 req/15min global, 20 req/15min sur /login
- Helmet pour les headers HTTP sécurisés
- CORS configuré sur l'URL du frontend uniquement
- Soft delete (actif=0) — aucune donnée supprimée physiquement
- Transactions SQL atomiques pour toutes les opérations de stock

---

## Tests

```bash
# Lancer les tests
npm test

# Avec coverage
npm test -- --coverage
```

Les tests utilisent des mocks de la base de données (aucune connexion réelle requise).

---

## Variables d'environnement

| Variable          | Description                           | Défaut       |
|-------------------|---------------------------------------|--------------|
| PORT              | Port du serveur                       | 3000         |
| NODE_ENV          | Environnement (development/production)| development  |
| DB_HOST           | Hôte MySQL                            | localhost    |
| DB_PORT           | Port MySQL                            | 3306         |
| DB_USER           | Utilisateur MySQL                     | root         |
| DB_PASSWORD       | Mot de passe MySQL                    | (vide)       |
| DB_NAME           | Nom de la base                        | saas_gestion_commerciale |
| JWT_SECRET        | Secret JWT (min 32 chars)             | OBLIGATOIRE  |
| JWT_EXPIRES_IN    | Durée de vie du token                 | 24h          |
| FRONTEND_URL      | URL frontend pour CORS                | http://localhost:3001 |

---

## Format des réponses API

**Succès :**
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 50, "total_pages": 2 }
}
```

**Erreur :**
```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": [{ "msg": "...", "path": "champ" }]
}
```
