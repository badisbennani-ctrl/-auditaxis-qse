const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives. Réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) {
  console.warn('⚠️ Variables EMAIL_USER, EMAIL_PASS ou EMAIL_TO manquantes');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const validateContact = [
  body('nom').trim().isLength({ min: 2, max: 100 }).withMessage('Nom invalide'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('sujet').trim().isLength({ min: 2, max: 200 }).withMessage('Sujet invalide'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message trop court'),
  body('company').optional().trim().isLength({ max: 100 }),
  body('website').optional().isEmpty().withMessage('Bot détecté')
];

router.post('/', contactLimiter, validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'DONNEES_INVALIDES', details: errors.array() });
    }

    if (req.body.website) {
      return res.status(400).json({ error: 'BOT_DETECTED' });
    }

    const { nom, email, sujet, message, company } = req.body;

    const sanitize = (str) => String(str).replace(/[<>]/g, '');

    const safeNom = sanitize(nom);
    const safeSujet = sanitize(sujet);
    const safeMessage = sanitize(message).replace(/\n/g, '<br>');
    const safeCompany = sanitize(company || 'Non renseignée');

    const htmlContent = `
      <div style="font-family: Arial; max-width:600px; margin:auto; padding:20px; border:1px solid #eee;">
        <h2 style="color:#1e5f8c;">Nouveau message</h2>
        <p><strong>Nom:</strong> ${safeNom}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Entreprise:</strong> ${safeCompany}</p>
        <p><strong>Sujet:</strong> ${safeSujet}</p>
        <div style="background:#f4f4f4; padding:10px;">${safeMessage}</div>
        <p style="font-size:12px;color:#999;">${new Date().toLocaleString()}</p>
      </div>
    `;

    if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) {
      return res.status(503).json({ error: 'SERVICE_INDISPONIBLE', message: 'Configuration email manquante' });
    }

    const info = await transporter.sendMail({
      from: `"AuditAxis QSE" <${EMAIL_USER}>`,
      to: EMAIL_TO,
      replyTo: email,
      subject: `[Contact] ${safeSujet}`,
      html: htmlContent,
    });

    console.log('✅ Email envoyé:', info.messageId);
    return res.status(200).json({ success: true, message: 'Message envoyé avec succès' });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ error: 'ERREUR_SERVEUR', message: 'Erreur lors de l\'envoi' });
  }
});

module.exports = router;