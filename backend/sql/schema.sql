-- ============================================================
-- SCRIPT SQL COMPLET — SaaS Gestion Commerciale
-- Alimentations Générales en Afrique
-- ============================================================
-- Encodage: utf8mb4
-- Compatible: MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

CREATE DATABASE IF NOT EXISTS saas_gestion_commerciale
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE saas_gestion_commerciale;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABLE: entreprises
-- ============================================================
CREATE TABLE IF NOT EXISTS entreprises (
  id INT NOT NULL AUTO_INCREMENT,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telephone VARCHAR(20) DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  logo VARCHAR(500) DEFAULT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'basic',
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role ENUM('admin','employe') NOT NULL DEFAULT 'employe',
  actif TINYINT(1) NOT NULL DEFAULT 1,
  derniere_connexion TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_users_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_categories_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: produits
-- ============================================================
CREATE TABLE IF NOT EXISTS produits (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  categorie_id INT DEFAULT NULL,
  nom VARCHAR(255) NOT NULL,
  code_barre VARCHAR(100) DEFAULT NULL,
  prix_achat DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  prix_vente DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock_actuel INT NOT NULL DEFAULT 0,
  stock_minimum INT NOT NULL DEFAULT 5,
  unite VARCHAR(50) NOT NULL DEFAULT 'unité',
  description TEXT DEFAULT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_produits_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_produits_categorie FOREIGN KEY (categorie_id)
    REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: fournisseurs
-- ============================================================
CREATE TABLE IF NOT EXISTS fournisseurs (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fournisseurs_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_clients_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: inventaire
-- ============================================================
CREATE TABLE IF NOT EXISTS inventaire (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  produit_id INT NOT NULL,
  user_id INT NOT NULL,
  fournisseur_id INT DEFAULT NULL,
  client_id INT DEFAULT NULL,
  type ENUM('entree','sortie') NOT NULL,
  quantite INT NOT NULL,
  prix_unitaire DECIMAL(12,2) DEFAULT NULL,
  date_mouvement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  commentaire TEXT DEFAULT NULL,
  reference VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_inventaire_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inventaire_produit FOREIGN KEY (produit_id)
    REFERENCES produits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inventaire_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_inventaire_fournisseur FOREIGN KEY (fournisseur_id)
    REFERENCES fournisseurs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inventaire_client FOREIGN KEY (client_id)
    REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: historique
-- ============================================================
CREATE TABLE IF NOT EXISTS historique (
  id INT NOT NULL AUTO_INCREMENT,
  entreprise_id INT NOT NULL,
  user_id INT NOT NULL,
  type_action ENUM(
    'creation_produit',
    'modification_produit',
    'suppression_produit',
    'modification_prix',
    'entree_stock',
    'sortie_stock',
    'creation_fournisseur',
    'modification_fournisseur',
    'suppression_fournisseur',
    'creation_client',
    'modification_client',
    'suppression_client'
  ) NOT NULL,
  entite_type VARCHAR(50) DEFAULT NULL,
  entite_id INT DEFAULT NULL,
  description TEXT NOT NULL,
  anciennes_valeurs JSON DEFAULT NULL,
  nouvelles_valeurs JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_historique_entreprise FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_historique_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VUES
-- ============================================================

CREATE OR REPLACE VIEW v_stock_actuel AS
SELECT
  p.id,
  p.nom,
  c.nom AS categorie,
  p.prix_achat,
  p.prix_vente,
  p.stock_actuel,
  p.stock_minimum,
  p.unite,
  (p.stock_actuel <= p.stock_minimum) AS stock_faible,
  (p.stock_actuel * p.prix_achat) AS valeur_stock_achat,
  (p.stock_actuel * p.prix_vente) AS valeur_stock_vente,
  e.nom AS entreprise
FROM produits p
LEFT JOIN categories c ON p.categorie_id = c.id
JOIN entreprises e ON p.entreprise_id = e.id
WHERE p.actif = 1;

CREATE OR REPLACE VIEW v_mouvements_detailles AS
SELECT
  i.id,
  i.type,
  i.quantite,
  i.prix_unitaire,
  (i.quantite * i.prix_unitaire) AS valeur_totale,
  i.date_mouvement,
  i.commentaire,
  i.reference,
  p.nom AS produit,
  p.unite,
  u.nom AS utilisateur,
  u.role AS role_utilisateur,
  f.nom AS fournisseur,
  c.nom AS client,
  e.nom AS entreprise
FROM inventaire i
JOIN produits p ON i.produit_id = p.id
JOIN users u ON i.user_id = u.id
JOIN entreprises e ON i.entreprise_id = e.id
LEFT JOIN fournisseurs f ON i.fournisseur_id = f.id
LEFT JOIN clients c ON i.client_id = c.id;

-- ============================================================
-- DONNÉES DE DÉMARRAGE
-- ============================================================

-- Entreprise
INSERT INTO entreprises (nom, email) VALUES ('Apple', 'apple@example.com');

-- Utilisateur admin (mot de passe en clair)
INSERT INTO users (entreprise_id, nom, email, mot_de_passe, role, actif)
VALUES (1, 'Achiraf', 'tairoua698@gmail.com', 'Achiraf123@', 'admin', 1);
