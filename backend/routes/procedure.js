const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Rate limiter spécifique au générateur de procédures
const procedureLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'LIMITE_ATTEINTE', message: 'Trop de procédures générées. Réessayez dans 15 minutes.' }
});

// Base de connaissances normatives
const NORMES_DATA = {
    'ISO 9001': `
=== ISO 9001:2015 — MANAGEMENT DE LA QUALITÉ ===
§ 4.1 Compréhension de l'organisme et de son contexte
§ 4.2 Compréhension des besoins et attentes des parties intéressées
§ 4.4 Système de management de la qualité et ses processus
§ 5.1 Leadership et engagement
§ 5.2 Politique qualité
§ 5.3 Rôles, responsabilités et autorités
§ 6.1 Actions face aux risques et opportunités
§ 6.2 Objectifs qualité et planification
§ 7.1 Ressources (humaines, infrastructure, environnement)
§ 7.2 Compétences
§ 7.3 Sensibilisation
§ 7.4 Communication
§ 7.5 Informations documentées
§ 8.1 Planification et maîtrise opérationnelles
§ 8.2 Exigences relatives aux produits et services
§ 8.4 Maîtrise des prestataires externes
§ 8.5 Production et prestation de service
§ 8.6 Libération des produits et services
§ 8.7 Maîtrise des éléments de sortie non conformes
§ 9.1 Surveillance, mesure, analyse et évaluation
§ 9.2 Audit interne
§ 9.3 Revue de direction
§ 10.2 Non-conformité et action corrective
§ 10.3 Amélioration continue`,

    'ISO 14001': `
=== ISO 14001:2015 — MANAGEMENT ENVIRONNEMENTAL ===
§ 4.1 Compréhension de l'organisme et de son contexte
§ 4.2 Besoins et attentes des parties intéressées
§ 4.4 Système de management environnemental
§ 5.2 Politique environnementale
§ 6.1.2 Aspects environnementaux significatifs
§ 6.1.3 Obligations de conformité légale
§ 6.1.4 Planification des actions environnementales
§ 6.2 Objectifs environnementaux et planification
§ 7.2 Compétences environnementales
§ 7.3 Sensibilisation environnementale
§ 7.4 Communication environnementale interne/externe
§ 8.1 Maîtrise opérationnelle des aspects significatifs
§ 8.2 Préparation aux situations d'urgence environnementales
§ 9.1 Surveillance et mesure de la performance environnementale
§ 9.2 Audit interne du SME
§ 9.3 Revue de direction environnementale
§ 10.2 Non-conformité et action corrective
§ 10.3 Amélioration continue de la performance environnementale`,

    'ISO 45001': `
=== ISO 45001:2018 — SANTÉ ET SÉCURITÉ AU TRAVAIL ===
§ 4.2 Besoins et attentes des travailleurs et parties intéressées
§ 5.1 Leadership et engagement SST
§ 5.2 Politique SST
§ 5.3 Rôles, responsabilités et autorités SST
§ 5.4 Consultation et participation des travailleurs
§ 6.1.2 Identification des dangers et évaluation des risques SST
§ 6.1.3 Évaluation des opportunités SST
§ 6.1.4 Exigences légales et autres exigences SST
§ 6.2 Objectifs SST et planification
§ 7.2 Compétences SST
§ 7.3 Sensibilisation SST
§ 8.1.1 Maîtrise opérationnelle SST
§ 8.1.2 Élimination des dangers — hiérarchie des mesures
§ 8.1.3 Gestion du changement
§ 8.1.4 Approvisionnement — coordination SST prestataires
§ 8.2 Préparation et réponse aux situations d'urgence SST
§ 9.1 Surveillance et mesure SST (TF, TG, presqu'accidents)
§ 9.1.2 Évaluation de la conformité légale SST
§ 9.2 Audit interne du SMSST
§ 9.3 Revue de direction SST
§ 10.2 Incidents, non-conformités et actions correctives
§ 10.3 Amélioration continue de la performance SST`
};

// Construction du prompt système
function buildSystemPrompt(norme, nomProcessus, description, secteur, taille, elements) {
    const normeData = NORMES_DATA[norme] || '';
    const elementsOptionnels = elements || [];

    return `Tu es un expert certifié en systèmes de management ISO (9001, 14001, 45001) avec 20 ans d'expérience en audit et rédaction de documentation qualité.

Ton rôle est de générer une procédure documentée professionnelle, prête à être utilisée dans un système de management certifiable.

NORME : ${norme}
NOM DU PROCESSUS : ${nomProcessus}
DESCRIPTION : ${description}
${secteur ? 'SECTEUR : ' + secteur : ''}
${taille ? 'TAILLE ENTREPRISE : ' + taille : ''}
ÉLÉMENTS À INCLURE : Logigramme, Tableau des responsabilités, Indicateurs KPI${elementsOptionnels.includes('Risques associés') ? ', Risques associés' : ''}${elementsOptionnels.includes('Documents associés') ? ', Documents associés' : ''}

RÉFÉRENTIEL NORMATIF APPLICABLE :
${normeData}

Génère une procédure complète en respectant EXACTEMENT cette structure avec les balises [[...]] :

[[OBJET ET DOMAINE]]
Objectif de la procédure (1-2 phrases) et périmètre d'application.

[[RÉFÉRENCES NORMATIVES]]
Articles précis de la norme applicable. Une référence par ligne avec le symbole §.

[[DÉFINITIONS]]
Termes clés avec leur définition. Format : - Terme : définition. Maximum 8 termes.

[[RESPONSABILITÉS]]
Tableau des responsabilités. Format STRICT avec | comme séparateur :
Rôle | Responsabilités | Actions principales
(minimum 3 rôles, maximum 6)

[[LOGIGRAMME]]
Étapes numérotées. Format STRICT :
ÉTAPE 1 : Titre | Description détaillée | Responsable
ÉTAPE 2 : Titre | Description détaillée | Responsable
(minimum 5 étapes, maximum 10)

[[INSTRUCTIONS]]
Description opérationnelle détaillée par sous-sections numérotées. Utiliser un langage impératif. Minimum 300 mots.

[[INDICATEURS KPI]]
Format STRICT avec | comme séparateur :
Nom de l'indicateur | Fréquence de mesure | Objectif cible
(minimum 3 KPI, maximum 6)

${elementsOptionnels.includes('Risques associés') ? `[[RISQUES]]
Format : - Risque : description | Probabilité : Faible/Moyenne/Élevée | Impact : Faible/Moyen/Élevé/Critique | Mesure préventive : action
` : ''}
${elementsOptionnels.includes('Documents associés') ? `[[DOCUMENTS ASSOCIÉS]]
Format : - CODE : Nom du document (type : formulaire/procédure/enregistrement)
` : ''}

RÈGLES IMPORTANTES :
1. Respecte EXACTEMENT les balises [[...]] — ne les modifie jamais
2. Utilise le séparateur | dans les tableaux et logigrammes
3. Adapte le contenu au secteur et à la taille de l'entreprise
4. Sois conforme aux exigences exactes de ${norme}
5. Utilise un français professionnel et formel
6. Commence DIRECTEMENT par [[OBJET ET DOMAINE]] sans aucun texte introductif`;
}

/**
 * POST /api/procedure
 * Génère une procédure ISO documentée via Gemini
 */
router.post('/', procedureLimiter, async (req, res, next) => {
    try {
        const { norme, nomProcessus, description, secteur, taille, elements } = req.body;

        // Validation des champs obligatoires
        if (!norme || !nomProcessus || !description) {
            return res.status(400).json({
                error: 'CHAMPS_MANQUANTS',
                message: 'Les champs norme, nomProcessus et description sont obligatoires.'
            });
        }

        if (description.length < 20) {
            return res.status(400).json({
                error: 'DESCRIPTION_TROP_COURTE',
                message: 'La description doit contenir au moins 20 caractères.'
            });
        }

        if (!['ISO 9001', 'ISO 14001', 'ISO 45001'].includes(norme)) {
            return res.status(400).json({
                error: 'NORME_INVALIDE',
                message: 'La norme doit être ISO 9001, ISO 14001 ou ISO 45001.'
            });
        }

        // Vérification clé API Gemini
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                error: 'SERVICE_INDISPONIBLE',
                message: 'Le service IA n\'est pas configuré.'
            });
        }

        // Appel Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = buildSystemPrompt(norme, nomProcessus, description, secteur, taille, elements);

        console.log(`[PROCEDURE] Génération pour: ${nomProcessus} (${norme})`);

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text || text.length < 200) {
            throw new Error('Réponse Gemini trop courte ou vide');
        }

        console.log(`[PROCEDURE] Généré avec succès: ${text.length} caractères`);

        res.json({
            success: true,
            procedure: text,
            meta: {
                norme,
                nomProcessus,
                secteur: secteur || null,
                taille: taille || null,
                generatedAt: new Date().toISOString(),
                characters: text.length
            }
        });

    } catch (error) {
        console.error('❌ [PROCEDURE_ERROR]:', error.message);
        
        // Gestion spécifique des erreurs Gemini
        if (error.message.includes('safety') || error.message.includes('blocked')) {
            return res.status(400).json({
                error: 'CONTENU_BLOQUE',
                message: 'Le contenu a été bloqué par les filtres de sécurité de l\'IA. Veuillez reformuler votre description.'
            });
        }

        if (error.message.includes('quota') || error.message.includes('429')) {
            return res.status(429).json({
                error: 'QUOTA_ATTEINT',
                message: 'Limite de quota atteinte pour l\'IA. Veuillez réessayer plus tard.'
            });
        }

        // Si ce n'est pas une erreur spécifique connue, on passe au handler global
        // mais on peut aussi renvoyer un message un peu plus précis si on veut
        res.status(500).json({
            error: 'ERREUR_GENERATION',
            message: `Erreur lors de la génération: ${error.message}`
        });
    }
});

module.exports = router;
