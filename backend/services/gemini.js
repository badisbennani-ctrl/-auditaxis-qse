const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RULES_DB } = require('./rules-db');

// Nettoyage de la clé API
const rawKey = process.env.GEMINI_API_KEY;
const apiKey = (rawKey && rawKey !== 'your_gemini_api_key_here') ? rawKey.trim() : null;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!genAI) {
    console.warn('⚠️ GEMINI_API_KEY non configurée ou invalide');
}

/**
 * Analyse un diagnostic QSE avec Gemini
 */
async function analyserDiagnostic(norme, description) {
    if (!genAI) {
        console.warn(`⚠️ Gemini non initialisé - analyse locale pour ${norme}`);
        return [];
    }

    const normId = norme.replace(':2015', '').replace(':2018', '').replace(' ', '');

    const rulesContext = Object.entries(RULES_DB)
        .filter(([id, rule]) => id.startsWith(normId))
        .map(([id, rule]) => `- ID: ${id} | Titre: ${rule.title} | Mots-clés: ${rule.keywords.join(', ')}`)
        .join('\n');

    // Utilisation de gemini-1.5-flash sur v1 (stable)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });

    const prompt = `Tu es un expert auditeur QSE. Analyse la situation suivante pour la norme ${norme}.

CONSIGNES:
1. Analyse UNIQUEMENT les faits présents.
2. Identifie les non-conformités (majeure/mineure).
3. Utilise UNIQUEMENT les IDs de règles fournis ci-dessous.
4. Réponds UNIQUEMENT en JSON.

RÈGLES ISO AUTORISÉES:
${rulesContext}

SITUATION:
"${description}"

FORMAT JSON ATTENDU:
{
  "findings": [
    {
      "ruleId": "ID",
      "status": "COMPLIANT|NON_CONFORM_CRITICAL|NON_CONFORM_MINOR|OBSERVATION",
      "evidence": "preuve",
      "explanation": "explication",
      "action": "recommandation"
    }
  ]
}`;

    try {
        const result = await model.generateContent(prompt);
        let content = result.response.text();
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsedResult = JSON.parse(content);
        parsedResult.findings = parsedResult.findings.filter(f => RULES_DB[f.ruleId]);

        return parsedResult.findings;
    } catch (error) {
        console.error(`❌ Erreur Gemini (${norme}):`, error.message);
        throw error;
    }
}

async function getEmbedding(text) {
    if (!apiKey) return null;
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" }, { apiVersion: 'v1' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        return null;
    }
}

module.exports = {
    analyserDiagnostic,
    getEmbedding
};
