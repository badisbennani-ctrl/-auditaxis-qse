require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

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
const corsOrigins = [
    'https://auditaxis-qse.com',
    'https://www.auditaxis-qse.com',
    'https://auditaxis-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

// Ajouter dynamiquement CORS_ORIGIN depuis les variables d'env si présent
if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(',').forEach(origin => {
        const trimmed = origin.trim();
        if (trimmed && !corsOrigins.includes(trimmed)) {
            corsOrigins.push(trimmed);
        }
    });
}

app.use(cors({
    origin: function(origin, callback) {
        // Autoriser les requêtes sans origine (comme les apps mobiles ou curl)
        if (!origin) return callback(null, true);

        // Vérification
        const isAllowed = corsOrigins.some(allowedOrigin => {
            if (origin === allowedOrigin) return true;
            // Autoriser tous les sous-domaines vercel.app pour le projet
            if (origin.endsWith('.vercel.app') && origin.includes('auditaxis')) return true;
            return false;
        });

        if (isAllowed || !isProduction) {
            callback(null, true);
        } else {
            console.warn(`⚠️ Blocage CORS pour l'origine: ${origin}`);
            const error = new Error('Not allowed by CORS');
            error.status = 403;
            error.code = 'CORS_FORBIDDEN';
            callback(error);
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
app.get('/api/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    };

    if (!isProduction) {
        health.services = {
            gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
            resend: process.env.RESEND_API_KEY ? 'configured' : 'missing',
            emailTo: process.env.EMAIL_TO ? 'configured' : 'missing',
            corsOrigin: process.env.CORS_ORIGIN ? 'configured' : 'default'
        };
    }

    res.json(health);
});

// Gestion centralisée des erreurs applicatives
app.use((err, req, res, next) => {
    if (err && err.code === 'CORS_FORBIDDEN') {
        return res.status(err.status || 403).json({
            error: 'CORS_FORBIDDEN',
            message: 'Origine non autorisée'
        });
    }

    console.error(`❌ Erreur API: ${err?.message || 'Erreur inconnue'}`);
    if (err?.stack && !isProduction) {
        console.error(err.stack);
    }

    return res.status(err?.status || 500).json({
        error: 'ERREUR_INTERNE',
        message: 'Une erreur interne est survenue'
    });
});

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
    console.log(`📧 EMAIL_TO: ${process.env.EMAIL_TO ? '✅ Configuré' : '⚠️ Non configuré'}`);
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
