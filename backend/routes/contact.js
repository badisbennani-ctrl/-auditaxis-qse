const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

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

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER || 'badis.bennani@gmail.com';
  const emailPass = process.env.EMAIL_PASS;
  
  if (!emailPass) {
    console.warn('⚠️ [CONFIG] EMAIL_PASS manquante. Le service de contact retournera une erreur 503.');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

if (!process.env.EMAIL_TO) {
  console.warn('⚠️ [CONFIG] EMAIL_TO manquante.');
}

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
    const transporter = getTransporter();

    if (!transporter || !emailTo) {
      console.log('📧 Email (fallback):', { de: nom, email, sujet });
      return res.status(503).json({
        success: false,
        message: 'Service email temporairement indisponible'
      });
    }

    try {
      const info = await transporter.sendMail({
        from: `"AuditAxis QSE" <badis.bennani@gmail.com>`,
        to: emailTo,
        replyTo: email,
        subject: `📩 [Contact] ${safeSujet}`,
        html: htmlContent,
      });

      console.log('✅ Email envoyé:', info.messageId);
      res.status(200).json({ success: true, message: 'Message envoyé avec succès' });
    } catch (error) {
      console.error('❌ Erreur envoi email:', error.message);
      res.status(500).json({ error: 'ERREUR_ENVOI', message: 'Le service de messagerie est temporairement indisponible.' });
    }
});

module.exports = router;