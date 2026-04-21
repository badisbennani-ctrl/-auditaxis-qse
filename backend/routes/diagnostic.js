const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { analyserDiagnostic } = require('../services/gemini');
const { calculateScoreForNorm, determineRiskLevel } = require('../services/qse-engine');

// Fallback local avec analyse par mots-clés uniquement (sans IA)
function analyseLocaleFallback(description, norme) {
    const { RULES_DB } = require('../services/rules-db');
    const descLower = description.toLowerCase();
    const findings = [];

    // Filtrer les règles pour cette norme
    const normPrefix = norme.replace(':2015', '').replace(':2018', '').replace(' ', '');
    const rulesForNorm = Object.entries(RULES_DB).filter(([id]) => id.startsWith(normPrefix.toUpperCase()));

    for (const [ruleId, rule] of rulesForNorm) {
        const matches = rule.keywords.filter(kw => descLower.includes(kw.toLowerCase()));
        if (matches.length >= 1) {
            findings.push({
                ruleId,
                status: matches.length >= 2 ? 'COMPLIANT' : 'OBSERVATION',
                evidence: `Mots-clés détectés: ${matches.join(', ')}`,
                explanation: rule.title,
                action: matches.length < 2 ? `Ajouter plus d'éléments sur: ${rule.keywords.slice(0, 3).join(', ')}` : 'Continuer à maintenir la conformité'
            });
        }
    }

    return findings;
}

// Rate Limiter
const diagnosticLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Réduit à 10 car 1 appel = 3 requêtes IA
    message: { error: 'LIMITE_ATTEINTE', message: 'Trop de diagnostics demandés.' }
});

/**
 * POST /api/diagnostic
 * Fusion QSE Finale : Lance les 3 audits et calcule les scores
 * Fallback: utilise l'analyse locale si Gemini n'est pas disponible
 */
router.post('/', diagnosticLimiter, async (req, res, next) => {
    try {
        const { description } = req.body;

        if (!description || description.length < 50) {
            return res.status(400).json({ error: 'TEXTE_TROP_COURT' });
        }

        // Lancement des 3 audits en parallèle avec gestion d'erreur
        let audit9001 = [], audit14001 = [], audit45001 = [];
        try {
            [audit9001, audit14001, audit45001] = await Promise.all([
                analyserDiagnostic('ISO 9001:2015', description).catch(() => []),
                analyserDiagnostic('ISO 14001:2015', description).catch(() => []),
                analyserDiagnostic('ISO 45001:2018', description).catch(() => [])
            ]);
        } catch (err) {
            console.log('⚠️ Erreur Gemini, fallback local');
        }

        // Fallback local si Gemini n'est pas disponible (tableaux vides retournés)
        const hasGeminiData = audit9001.length > 0 || audit14001.length > 0 || audit45001.length > 0;
        if (!hasGeminiData) {
            console.log('⚠️ Fallback: analyse locale sans IA');
            audit9001 = analyseLocaleFallback(description, 'ISO 9001:2015');
            audit14001 = analyseLocaleFallback(description, 'ISO 14001:2015');
            audit45001 = analyseLocaleFallback(description, 'ISO 45001:2018');
        }

        // Calcul des scores via le moteur (avec validation hybride Mots-clés + Vectoriel)
        const [res9001, res14001, res45001] = await Promise.all([
            calculateScoreForNorm(audit9001, 'iso9001'),
            calculateScoreForNorm(audit14001, 'iso14001'),
            calculateScoreForNorm(audit45001, 'iso45001')
        ]);

        // Fusion QSE Finale
        const globalScore = Math.round((res9001.score + res14001.score + res45001.score) / 3);
        const allFindings = [...res9001.findings, ...res14001.findings, ...res45001.findings];
        const criticalCount = allFindings.filter(f => f.status === 'NON_CONFORM_CRITICAL').length;

        const fusionResult = {
            iso_9001_score: res9001.score,
            iso_14001_score: res14001.score,
            iso_45001_score: res45001.score,
            global_qse_score: globalScore,
            risk_level: determineRiskLevel(globalScore, criticalCount),
            details: {
                iso9001: res9001.findings,
                iso14001: res14001.findings,
                iso45001: res45001.findings
            },
            reliability: {
                invalidated_count: res9001.invalidatedCount + res14001.invalidatedCount + res45001.invalidatedCount,
                total_rejected_hallucinations: res9001.invalidatedCount + res14001.invalidatedCount + res45001.invalidatedCount
            },
            summary: {
                total_valid_findings: allFindings.length,
                critical_nc: criticalCount
            }
        };

        res.json({
            success: true,
            data: fusionResult
        });

    } catch (error) {
        console.error('❌ Erreur Fusion QSE:', error.message);
        console.error('Stack:', error.stack);
        next(error);
    }
});

module.exports = router;
