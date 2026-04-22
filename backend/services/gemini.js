const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RULES_DB } = require('./rules-db');

// Initialisation sécurisée de Gemini
const genAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

if (!genAI) {
    console.warn('⚠️ GEMINI_API_KEY non configurée — le diagnostic IA utilisera le mode local uniquement');
}

/**
 * Analyse un diagnostic QSE avec Gemini Flash
 * Utilise les instructions système pour chaque domaine (9001, 14001, 45001)
 * Retourne un tableau vide si genAI n'est pas initialisé
 */
async function analyserDiagnostic(norme, description) {
    if (!genAI) {
        console.warn(`⚠️ Gemini non initialisé - analyse locale pour ${norme}`);
        return []; // Retourne vide, le fallback local prendra le relais
    }

    const normId = norme.replace(':2015', '').replace(':2018', '').replace(' ', ''); // ex: ISO9001

    // Extraire les règles pertinentes pour cette norme pour le contexte de l'IA
    const rulesContext = Object.entries(RULES_DB)
        .filter(([id, rule]) => id.startsWith(normId))
        .map(([id, rule]) => `- ID: ${id} | Titre: ${rule.title} | Mots-clés: ${rule.keywords.join(', ')}`)
        .join('\n');

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `Tu es un expert auditeur des systèmes de management intégrés selon les normes ISO 9001 (qualité), ISO 14001 (environnement) et ISO 45001 (santé et sécurité au travail).

1. RÈGLE FONDAMENTALE (OBLIGATOIRE)
- Tu analyses UNIQUEMENT les informations explicitement présentes dans le texte
- Aucune hypothèse, aucune invention, aucune extrapolation
- Toute non-conformité doit être basée sur une preuve textuelle directe

2. IDENTIFICATION DES NON-CONFORMITÉS
Pour chaque non-conformité détectée, tu dois préciser :
- Fait observé (preuve exacte du texte)
- Norme concernée : ISO 9001 (qualité), ISO 14001 (environnement), ISO 45001 (SST)
- Exigence normative précise (article ou clause)
- Type de non-conformité : mineure ou majeure
- Justification du lien direct entre fait et exigence

3. INTERDICTIONS STRICTES
- Ne jamais ajouter de problèmes non mentionnés dans la situation
- Ne jamais produire de score global ou pourcentage
- Ne jamais mélanger des hypothèses avec les faits
- Ne jamais inventer des clauses non pertinentes

4. CONTRAINTES TECHNIQUES
- N'utilise QUE les identifiants (ID) de règles fournis dans la liste
- Si une situation ne matche pas au moins 2 mots-clés d'une règle, ignore la règle
- STATUTS AUTORISÉS : "COMPLIANT", "NON_CONFORM_CRITICAL", "NON_CONFORM_MINOR", "OBSERVATION"
- Réponds UNIQUEMENT avec un objet JSON valide`
    });

    const prompt = `CONTEXTE DE L'AUDIT: ${norme}

LISTE DES RÈGLES ISO AUTORISÉES (référentiel de validation):
${rulesContext}

SITUATION À ANALYSER:
"""
${description}
"""

FORMAT DE SORTIE OBLIGATOIRE (JSON strict):
{
  "findings": [
    {
      "ruleId": "ID_DE_LA_REGLE_DOIT_EXISTER_DANS_LISTE",
      "status": "COMPLIANT|NON_CONFORM_CRITICAL|NON_CONFORM_MINOR|OBSERVATION",
      "evidence": "citation ou paraphrase factuelle du texte analysé",
      "explanation": "exigence normative précise avec référence clause ISO",
      "action": "action corrective ou recommandation basée sur les faits"
    }
  ]
}

IMPORTANT:
- Uniquement des faits observables dans le texte
- Chaque finding doit correspondre à un ID de règle valide
- evidence doit être une preuve textuelle directe
- Si aucune règle ne matche, retourner un tableau vide`;

    try {
        const result = await model.generateContent(prompt);
        let content = result.response.text();
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsedResult = JSON.parse(content);

        // Post-validation : s'assurer que les IDs existent dans RULES_DB
        parsedResult.findings = parsedResult.findings.filter(f => RULES_DB[f.ruleId]);

        return parsedResult.findings;
    } catch (error) {
        console.error(`❌ Erreur Gemini (${norme}):`, error.message);
        throw error;
    }
}

/**
 * Génère un vecteur (embedding) pour un texte donné
 * Retourne null si la clé API n'est pas configurée ou si le modèle n'est pas disponible
 */
async function getEmbedding(text) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return null; // API key non configurée
    }
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        // Silencieux - le fallback keywords prendra le relais
        return null;
    }
}

module.exports = {
    analyserDiagnostic,
    getEmbedding
};
