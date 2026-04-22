const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

// Fonction simple pour échapper le HTML et prévenir les injections dans les mails
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

// === Limiter les envois ===
const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialisation lazy pour éviter le crash si RESEND_API_KEY est manquante
const getResendClient = () => {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    return new Resend(process.env.RESEND_API_KEY);
};

// Log de configuration au démarrage
if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ [CONFIG] RESEND_API_KEY manquante. Le service de contact retournera une erreur 503.');
}
if (!process.env.EMAIL_TO) {
    console.warn('⚠️ [CONFIG] EMAIL_TO manquante. Le service de contact retournera une erreur 503.');
}

// === Route de contact avec validation ===
router.post('/', 
  contactLimiter,
  [
    body('nom').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('sujet').trim().isLength({ min: 2, max: 200 }).escape(),
    body('message').trim().isLength({ min: 10, max: 2000 }).escape(),
    body('company').optional().trim().isLength({ max: 100 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'DONNEES_INVALIDES', details: errors.array() });
    }

    const { nom, email, sujet, message, company } = req.body;

    // === Préparation de l'email (Échappé) ===
    const safeNom = escapeHTML(nom);
    const safeSujet = escapeHTML(sujet);
    const safeMessage = escapeHTML(message).replace(/\n/g, '<br>');
    const safeCompany = escapeHTML(company || 'Non renseignée');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #1e5f8c; border-bottom: 2px solid #1e5f8c; padding-bottom: 10px;">Nouveau message de contact</h2>
        <p><strong>De:</strong> ${safeNom} (${email})</p>
        <p><strong>Entreprise:</strong> ${safeCompany}</p>
        <p><strong>Sujet:</strong> ${safeSujet}</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px;">
          <strong>Message:</strong><br>${safeMessage}
        </div>
        <p style="font-size: 12px; color: #888; margin-top: 20px;">Envoyé le : ${new Date().toLocaleString()}</p>
      </div>
    `;

    const emailTo = process.env.EMAIL_TO;
    const fromEmail = 'onboarding@resend.dev';
    const client = getResendClient();

    if (!client || !emailTo) {
      // Mode fallback : log uniquement, pas d'envoi
      console.log('📧 Email (fallback - non envoyé):', { de: nom, email, sujet });
      return res.status(503).json({
        success: false,
        message: 'Service email temporairement indisponible'
      });
    }

    try {
      const { data, error } = await client.emails.send({
        from: `AuditAxis <${fromEmail}>`,
        to: [emailTo],
        subject: `📩 [Contact] ${safeSujet}`,
        reply_to: email, // Permet de répondre directement à l'expéditeur
        html: htmlContent,
      });

      if (error) {
        console.error('❌ Erreur API Resend:', error);
        return res.status(500).json({ error: 'ERREUR_RESEND', message: error.message });
      }

      console.log('✅ Email envoyé avec succès:', data.id);
      res.status(200).json({ success: true, message: 'Message envoyé avec succès' });
    } catch (error) {
      console.error('❌ Erreur technique envoi email:', error.message);
      res.status(500).json({ error: 'ERREUR_ENVOI', message: 'Le service de messagerie est temporairement indisponible.' });
    }
});

module.exports = router;
