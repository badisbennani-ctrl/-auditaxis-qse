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
        systemInstruction: `Tu es un auditeur senior certifié expert en ${norme}.
Ton rôle est d'analyser une situation d'entreprise et de mapper tes constats UNIQUEMENT sur la base de règles fournie.

RÈGLES CRITIQUES:
1. MATCHING STRICT: N'utilise QUE les identifiants (ID) fournis dans la liste ci-dessous.
2. PAS D'INFERENCE: Si une situation ne matche pas au moins 2 mots-clés d'une règle, ignore la règle.
3. STATUTS AUTORISÉS: "COMPLIANT", "NON_CONFORM_CRITICAL", "NON_CONFORM_MINOR", "OBSERVATION".
4. FORMAT: Réponds UNIQUEMENT avec un objet JSON valide.`
    });

    const prompt = `LISTE DES RÈGLES ISO AUTORISÉES:
${rulesContext}

SITUATION À ANALYSER:
"""
${description}
"""

FORMAT DE SORTIE OBLIGATOIRE (JSON):
{
  "findings": [
    {
      "ruleId": "ID_DE_LA_REGLE",
      "status": "STATUS",
      "evidence": "preuve factuelle extraite du texte",
      "explanation": "exigence de la norme",
      "action": "action corrective suggérée"
    }
  ]
}`;

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
