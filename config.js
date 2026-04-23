// ============================================
// CONFIGURATION GLOBALE - AUDITAXIS QSE
// ============================================

(function () {

    // Détection automatique de l'environnement
    const isLocal = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1';

    const CONFIG = Object.freeze({

        // URL du backend — bascule automatiquement local ↔ production
        API_BASE_URL: isLocal
            ? 'http://localhost:3001'
            : 'https://auditaxis-qse.onrender.com',

        // Paramètres du diagnostic
        DIAGNOSTIC: Object.freeze({
            MIN_CHARS: 50,
            RATE_LIMIT_MS: 10000
        }),

        // Informations de contact
        CONTACT: Object.freeze({
            EMAIL: 'contact@auditaxis-qse.com',
            HOURS: 'Lun - Ven : 9h - 17h',
            SUPPORT: 'Support disponible 24h/24 et 7j/7',
            RESPONSE_TIME: 'Réponse sous 24 à 48 heures'
        })
    });

    // Validation à l'initialisation — alerte le développeur si config incomplète
    const requiredKeys = ['API_BASE_URL', 'DIAGNOSTIC', 'CONTACT'];
    requiredKeys.forEach(function (key) {
        if (CONFIG[key] === undefined || CONFIG[key] === null) {
            console.error('[AuditAxis] Configuration manquante : ' + key);
        }
    });

    // Injection des infos de contact dans le DOM si les éléments existent
    document.addEventListener('DOMContentLoaded', function () {
        const emailEls = document.querySelectorAll('[data-contact="email"]');
        const hoursEls = document.querySelectorAll('[data-contact="hours"]');
        const supportEls = document.querySelectorAll('[data-contact="support"]');
        const responseTimeEls = document.querySelectorAll('[data-contact="response-time"]');
        emailEls.forEach(function (el) { el.textContent = CONFIG.CONTACT.EMAIL; });
        hoursEls.forEach(function (el) { el.textContent = CONFIG.CONTACT.HOURS; });
        supportEls.forEach(function (el) { el.textContent = CONFIG.CONTACT.SUPPORT; });
        responseTimeEls.forEach(function (el) { el.textContent = CONFIG.CONTACT.RESPONSE_TIME; });
    });

    // Exposition globale
    window.AUDITAXIS_CONFIG = CONFIG;

})();
