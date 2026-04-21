const { RULES_DB } = require('./rules-db');
const { getEmbedding } = require('./gemini');

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * VALIDATEUR HYBRIDE (Mots-clés + Vectoriel)
 * Si les mots-clés ne suffisent pas, on vérifie la similarité sémantique.
 * Fallback: Si embedding indisponible, utilise uniquement mots-clés avec seuil réduit
 */
async function validateFindingHybrid(finding) {
    const rule = RULES_DB[finding.ruleId];
    if (!rule) return { valid: false, score: 0 };

    const evidence = (finding.evidence || "").toLowerCase();

    // 1. Check mots-clés
    const kwMatches = rule.keywords.filter(kw => evidence.includes(kw.toLowerCase().replace(/s$/, "")));
    if (kwMatches.length >= 2) return { valid: true, method: 'keywords', score: 1.0 };

    // 2. Fallback: 1 mot-clé suffit si embedding indisponible
    if (kwMatches.length === 1) {
        // Tente embedding pour confirmation
        try {
            const evidenceVector = await getEmbedding(evidence);
            const ruleVector = await getEmbedding(rule.title + " " + rule.keywords.join(" "));

            if (evidenceVector && ruleVector && evidenceVector.length > 0 && ruleVector.length > 0) {
                const similarity = cosineSimilarity(evidenceVector, ruleVector);
                if (similarity > 0.75) {
                    return { valid: true, method: 'vectorial', score: similarity };
                }
            }
        } catch (err) {
            // Embedding indisponible - on accepte avec 1 mot-clé
            console.log(`⚠️ Embedding indisponible, fallback keywords pour ${finding.ruleId}`);
        }
        // Fallback: 1 mot-clé suffit avec score réduit
        return { valid: true, method: 'keywords_partial', score: 0.7 };
    }

    return { valid: false, score: 0 };
}

/**
 * Calcule le score pour une norme spécifique (Asynchrone pour le vectoriel)
 */
async function calculateScoreForNorm(findings, normId) {
    let totalPoints = 0;
    let earnedPoints = 0;
    let criticalNCs = 0;
    let validFindings = [];

    // Analyse de chaque constat en parallèle
    const validations = await Promise.all(findings.map(f => validateFindingHybrid(f)));

    findings.forEach((f, index) => {
        const validation = validations[index];
        if (!validation.valid) return;

        const rule = RULES_DB[f.ruleId];
        totalPoints += rule.weight;
        validFindings.push({ ...f, matching_method: validation.method });

        if (f.status === "COMPLIANT") {
            earnedPoints += rule.weight;
        } else if (f.status === "OBSERVATION") {
            earnedPoints += rule.weight * 0.5;
        } else if (f.status === "NON_CONFORM_CRITICAL") {
            criticalNCs++;
            earnedPoints -= rule.weight * 1.5;
        }
    });

    if (totalPoints === 0) return { score: 0, findings: [], invalidatedCount: findings.length };

    let baseScore = (earnedPoints / totalPoints) * 100;
    let finalScore = baseScore - (criticalNCs * 15);

    return {
        score: Math.max(0, Math.min(100, Math.round(finalScore))),
        findings: validFindings,
        invalidatedCount: findings.length - validFindings.length
    };
}

function determineRiskLevel(globalScore, criticalCount) {
    if (criticalCount > 0) return "critical";
    if (globalScore < 40) return "high";
    if (globalScore < 75) return "medium";
    return "low";
}

module.exports = {
    calculateScoreForNorm,
    determineRiskLevel
};
