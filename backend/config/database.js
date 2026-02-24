const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_gestion_commerciale',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  decimalNumbers: true,
});

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connexion MySQL établie avec succès');
    conn.release();
  } catch (err) {
    console.error('❌ Erreur connexion MySQL:', err.message);
    process.exit(1);
  }
};

/**
 * Exécute une requête SQL avec paramètres
 */
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Démarre une transaction et retourne la connexion
 */
const beginTransaction = async () => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  return conn;
};

module.exports = { pool, query, testConnection, beginTransaction };
