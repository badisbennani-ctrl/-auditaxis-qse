require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Sécurisation des headers HTTP
app.use(helmet());
app.disable('x-powered-by');

app.set('trust proxy', 1);

// Configuration du Rate Limiting (Protection contre les abus et DDoS)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP à 100 requêtes par fenêtre
    standardHeaders: true, // Retourne les infos de limite dans les headers `RateLimit-*`
    legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
    message: {
        error: 'TROP_DE_REQUETES',
        message: 'Trop de requêtes provenant de cette adresse IP, veuillez réessayer après 15 minutes.'
    }
});

// Appliquer le limiter à toutes les routes de l'API
app.use('/api/', limiter);

app.use(express.json());

// Middleware de logging structuré pour Render
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// CORS configuré pour Vercel + domaine personnalisé + fallback dev
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : [
        'https://auditaxis-qse.vercel.app',
        'https://auditaxis-qse.com',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
      ];

app.use(cors({
    origin: function(origin, callback) {
        // Autoriser les requêtes sans origine (comme les apps mobiles ou curl)
        if (!origin) return callback(null, true);

        // Vérification dynamique
        const isAllowed = corsOrigins.some(allowedOrigin => {
            // Support exact match
            if (origin === allowedOrigin) return true;
            // Support wildcard pour les branches Vercel (ex: auditaxis-*-vercel.app)
            if (allowedOrigin.includes('*')) {
                const regex = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
                return regex.test(origin);
            }
            return false;
        });

        if (isAllowed || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(`⚠️ Blocage CORS pour l'origine: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
}));

// Import des routes
const diagnosticRoutes = require('./routes/diagnostic');
const checklistRoutes = require('./routes/checklist');
const contactRoutes = require('./routes/contact');

// Enregistrement des routes avec préfixe /api
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/contact', contactRoutes);

// Route racine (pour éviter 404 sur /)
app.get('/', (req, res) => res.json({
    name: 'AuditAxis QSE API',
    version: '1.0.0',
    endpoints: {
        health: '/api/health',
        diagnostic: 'POST /api/diagnostic',
        checklist: '/api/checklist',
        contact: 'POST /api/contact'
    },
    documentation: 'https://github.com/badisbennani-ctrl/auditaxis-backend'
}));

// Health check
app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅' : '❌',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅' : '❌',
        EMAIL_TO: process.env.EMAIL_TO || '❌',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'default'
    }
}));

// 404 handler pour routes non trouvées
app.use((req, res) => {
  console.log(`⚠️ ROUTE_NON_TROUVEE: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'ROUTE_NON_TROUVEE',
    message: `Route ${req.method} ${req.path} non trouvée`
  });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`✅ Serveur AuditAxis démarré sur le port ${PORT}`);
    console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Configurée' : '❌ MANQUANTE'}`);
    console.log(`📧 EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Configuré' : '⚠️ Non configuré (mode fallback)'}`);
    console.log(`🌐 CORS Origins: ${corsOrigins.join(', ')}`);
});

// Gestion des erreurs non capturées pour éviter les crashs
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    console.error(error.stack);
    // On ne quitte pas brutalement — on log et on continue
});

module.exports = app;
