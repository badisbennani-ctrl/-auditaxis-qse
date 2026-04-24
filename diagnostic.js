/**
 * DIAGNOSTIC.JS - AuditAxis QSE
 * Moteur de diagnostic QSE Hybrid (IA + Local)
 */

(function() {
    const DEBUG = true;
    let selectedNorm = null;
    const MIN_CHARS = 50;

    function debugLog(...args) {
        if (DEBUG) console.log("[Diagnostic]", ...args);
    }

    // 1. GESTION DES NORMES
    window.selectNorm = function(element) {
        const norm = element.getAttribute('data-norm');
        debugLog("Norme sélectionnée :", norm);

        // UI Update
        document.querySelectorAll('.norm-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');

        selectedNorm = norm;
        checkCanLaunch();
    };

    // 2. COMPTEUR DE CARACTÈRES
    window.updateCharCounter = function() {
        const textarea = document.getElementById('situation');
        const counter = document.getElementById('charCounter');
        if (!textarea || !counter) return;

        const length = textarea.value.trim().length;
        counter.textContent = `${length} / ${MIN_CHARS} caractères minimum`;

        if (length < MIN_CHARS) {
            counter.style.color = '#ef4444'; // Red
        } else {
            counter.style.color = '#10b981'; // Green
        }
    };

    // 3. VALIDATION DU BOUTON
    window.checkCanLaunch = function() {
        const textarea = document.getElementById('situation');
        const btn = document.getElementById('launchBtn');
        if (!textarea || !btn) return;

        const isLengthValid = textarea.value.trim().length >= MIN_CHARS;
        const isNormSelected = selectedNorm !== null;

        btn.disabled = !(isLengthValid && isNormSelected);
    };

    // 4. LANCEMENT DU DIAGNOSTIC
    window.launchDiagnostic = async function() {
        const textarea = document.getElementById('situation');
        const loader = document.getElementById('loader');
        const results = document.getElementById('results');
        const btn = document.getElementById('launchBtn');
        const config = window.AUDITAXIS_CONFIG;

        if (!textarea || !selectedNorm || !config) return;

        // UI States
        btn.disabled = true;
        loader.style.display = 'flex';
        results.style.display = 'none';
        window.scrollTo({ top: loader.offsetTop - 100, behavior: 'smooth' });

        try {
            const response = await fetch(`${config.API_BASE_URL}/api/diagnostic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    norme: selectedNorm,
                    description: textarea.value.trim()
                })
            });

            const resultData = await response.json();

            if (!response.ok) {
                throw new Error(resultData.message || "Erreur lors de l'analyse.");
            }

            displayResults(resultData.data);

        } catch (error) {
            console.error("Erreur Diagnostic:", error);
            alert("Une erreur est survenue : " + error.message);
            btn.disabled = false;
        } finally {
            loader.style.display = 'none';
        }
    };

    // 5. AFFICHAGE DES RÉSULTATS
    function displayResults(data) {
        const results = document.getElementById('results');
        const scoreValue = document.getElementById('scoreValue');
        const progressCircle = document.getElementById('progressCircle');
        const appreciation = document.getElementById('appreciation');
        const nonConformitesList = document.getElementById('nonConformitesList');
        const conformitesList = document.getElementById('conformitesList');
        const recommandationsList = document.getElementById('recommandationsList');

        // Score
        const score = data.global_qse_score;
        scoreValue.textContent = score;
        
        // Progress Circle (dasharray 408.4)
        const offset = 408.4 - (408.4 * score / 100);
        progressCircle.style.strokeDashoffset = offset;

        // Appreciation
        if (score >= 80) appreciation.textContent = "Excellente conformité";
        else if (score >= 50) appreciation.textContent = "Conformité partielle - Améliorations requises";
        else appreciation.textContent = "Conformité critique - Actions immédiates nécessaires";

        // Lists
        renderList(nonConformitesList, data.details, 'NON_CONFORM');
        renderList(conformitesList, data.details, 'COMPLIANT');
        renderList(recommandationsList, data.details, 'OBSERVATION');

        results.style.display = 'block';
        window.scrollTo({ top: results.offsetTop - 100, behavior: 'smooth' });
    }

    function renderList(container, details, type) {
        container.innerHTML = '';
        let count = 0;

        // details is { iso9001: [], iso14001: [], iso45001: [] }
        Object.values(details).forEach(findings => {
            findings.forEach(finding => {
                if (finding.status.includes(type) || (type === 'NON_CONFORM' && finding.status.includes('NON_CONFORM'))) {
                    count++;
                    const item = document.createElement('div');
                    item.className = `result-item ${type.toLowerCase().includes('non_conform') ? 'majeure' : type.toLowerCase()}`;
                    item.innerHTML = `
                        <strong>${finding.ruleId} : ${finding.explanation}</strong>
                        <p>${finding.evidence}</p>
                        <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.8;">
                            💡 <em>Action conseillée : ${finding.action}</em>
                        </div>
                    `;
                    container.appendChild(item);
                }
            });
        });

        if (count === 0) {
            container.innerHTML = '<p style="opacity: 0.6; font-style: italic;">Aucun élément détecté dans cette catégorie.</p>';
        }
    }

    window.newDiagnostic = function() {
        document.getElementById('situation').value = '';
        document.getElementById('results').style.display = 'none';
        document.getElementById('launchBtn').disabled = true;
        document.querySelectorAll('.norm-btn').forEach(btn => btn.classList.remove('active'));
        selectedNorm = null;
        updateCharCounter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        debugLog("Prêt.");
        updateCharCounter();
    });

})();
