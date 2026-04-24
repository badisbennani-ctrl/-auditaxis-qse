/**
 * PROCEDURE.JS - AuditAxis QSE
 * Gestion du générateur de procédures ISO avec l'IA
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('procedureForm');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const procedureOutput = document.getElementById('procedureOutput');
    const resultBadge = document.getElementById('resultBadge');
    const config = window.AUDITAXIS_CONFIG;

    if (!form) return;

    // Réveil silencieux du backend (Render free tier)
    const wakeUpBackend = async () => {
        try {
            await fetch(`${config.API_BASE_URL}/api/health`);
            console.log("[AuditAxis] Backend réveillé.");
        } catch (e) {
            console.warn("[AuditAxis] Échec du réveil backend silencieux.");
        }
    };
    wakeUpBackend();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Récupération des données
        const elements = Array.from(form.querySelectorAll('input[name="elements"]:checked'))
            .map(cb => cb.value);

        const data = {
            norme: document.getElementById('norme').value,
            nomProcessus: document.getElementById('nomProcessus').value,
            secteur: document.getElementById('secteur').value,
            taille: document.getElementById('taille').value,
            description: document.getElementById('description').value,
            elements: elements
        };

        // UI States
        loading.style.display = 'flex';
        result.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await fetch(`${config.API_BASE_URL}/api/procedure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const resultData = await response.json();

            if (!response.ok) {
                throw new Error(resultData.message || "Une erreur est survenue lors de la génération.");
            }

            // Affichage du résultat
            displayResult(resultData.procedure, data.norme);

        } catch (error) {
            console.error("Erreur:", error);
            alert("Erreur: " + error.message);
        } finally {
            loading.style.display = 'none';
        }
    });

    function displayResult(text, norme) {
        // Formater le badge
        const normClass = norme.replace(' ', '-').toLowerCase();
        resultBadge.innerHTML = `<span class="tag-norm tag-${norme.split(' ')[1]}">${norme}</span>`;
        
        // Injecter le texte
        procedureOutput.innerText = text;
        
        // Afficher la section
        result.style.display = 'block';
        
        // Scroll vers le résultat
        result.scrollIntoView({ behavior: 'smooth' });
    }
});
