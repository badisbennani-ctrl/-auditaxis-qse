// ============================================
// CONFIGURATION GLOBALE - AUDITAXIS QSE
// ============================================

const CONFIG = {
    // URL du backend (Render)
    API_BASE_URL: 'https://auditaxis-qse.onrender.com',
    
    // Paramètres du diagnostic
    DIAGNOSTIC: {
        MIN_CHARS: 50,
        RATE_LIMIT_MS: 10000
    },
    
    // Informations de contact par défaut
    CONTACT: {
        EMAIL: 'contact@auditaxis-qse.com',
        HOURS: 'Lun - Ven : 9h - 17h'
    }
};

// Exposer la config globalement
window.AUDITAXIS_CONFIG = CONFIG;
