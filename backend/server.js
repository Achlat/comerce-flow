require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { testConnection } = require('./config/database');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Dossier build du frontend (../dist depuis backend/)
const FRONTEND_DIST = path.join(__dirname, '..', 'dist');

// ─── Sécurité ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Rate limiting strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// ─── Parsing ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Frontend statique (build React) ─────────────────────────────────────────
const fs = require('fs');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Toutes les routes non-API servent index.html (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log('📁 Frontend servi depuis:', FRONTEND_DIST);
} else {
  // Pas encore buildé — message d'aide
  app.get('*', (req, res) => {
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>⚙️ Backend API actif sur le port ${PORT}</h2>
        <p>Le frontend n'est pas encore compilé.</p>
        <p>Lance dans un terminal séparé :</p>
        <pre style="background:#f0f0f0;padding:16px">cd c:/xampp/htdocs/comerce-flow-main
npm run build</pre>
        <p>Puis redémarre le serveur. L'app sera accessible sur <strong>http://localhost:${PORT}</strong></p>
      </body></html>
    `);
  });
}

// ─── Gestion des erreurs ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
