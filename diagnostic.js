/**
 * DIAGNOSTIC.JS - Version Corrigée
 * Les constantes ont été déplacées en haut pour éviter les erreurs d'initialisation.
 */

// 1. DÉCLARATION DES VARIABLES GLOBALES ET CONSTANTES
const DEBUG = true;
const MIN_CHARS = 50;
const MAX_CHARS = 1000;
let selectedNorm = null;

// 2. FONCTIONS DE LOGGING
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

// Premier log d'initialisation (ne causera plus d'erreur)
debugLog("Initialisation du script diagnostic...");

// 3. GESTION DES NORMES (ISO)
function selectNorm(normId) {
    debugLog("Norme sélectionnée :", normId);
    
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.norm-card').forEach(card => {
        card.classList.remove('active', 'border-primary');
    });

    // Ajouter la classe active au bouton sélectionné
    const selectedCard = document.querySelector(`[onclick="selectNorm('${normId}')"]`);
    if (selectedCard) {
        selectedCard.classList.add('active', 'border-primary');
    }

    selectedNorm = normId;
    validateForm();
}

// 4. GESTION DU COMPTEUR DE CARACTÈRES
function updateCharCounter() {
    const textarea = document.getElementById('companyDescription');
    const counter = document.getElementById('charCounter');
    
    if (!textarea || !counter) return;

    const length = textarea.value.length;
    counter.innerText = `${length} / ${MIN_CHARS} caractères minimum`;

    if (length < MIN_CHARS) {
        counter.style.color = 'red';
    } else if (length > MAX_CHARS) {
        counter.style.color = 'orange';
        counter.innerText = `${length} / ${MAX_CHARS} caractères maximum`;
    } else {
        counter.style.color = 'green';
    }
    
    validateForm();
}

// 5. VALIDATION DU FORMULAIRE
function validateForm() {
    const textarea = document.getElementById('companyDescription');
    const launchBtn = document.getElementById('launchDiagnostic');
    
    if (!textarea || !launchBtn) return;

    const isLengthValid = textarea.value.length >= MIN_CHARS && textarea.value.length <= MAX_CHARS;
    const isNormSelected = selectedNorm !== null;

    if (isLengthValid && isNormSelected) {
        launchBtn.disabled = false;
        launchBtn.style.opacity = "1";
        launchBtn.style.cursor = "pointer";
    } else {
        launchBtn.disabled = true;
        launchBtn.style.opacity = "0.5";
        launchBtn.style.cursor = "not-allowed";
    }
}

// 6. LANCEMENT DU DIAGNOSTIC
async function startDiagnostic() {
    if (!selectedNorm) {
        alert("Veuillez sélectionner une norme.");
        return;
    }

    const description = document.getElementById('companyDescription').value;
    
    const diagnosticData = {
        norme: selectedNorm,
        description: description,
        timestamp: new Date().toISOString()
    };

    debugLog("Envoi des données :", diagnosticData);
    
    // Simulation de chargement
    const btn = document.getElementById('launchDiagnostic');
    btn.innerText = "Analyse en cours...";
    btn.disabled = true;

    // Redirection ou appel API ici
    setTimeout(() => {
        alert("Diagnostic lancé avec succès pour " + selectedNorm);
        btn.innerText = "Lancer le diagnostic";
        btn.disabled = false;
    }, 2000);
}

// 7. INITIALISATION AU CHARGEMENT DE LA PAGE
document.addEventListener('DOMContentLoaded', () => {
    debugLog("DOM chargé, configuration des écouteurs d'événements.");
    
    const textarea = document.getElementById('companyDescription');
    if (textarea) {
        textarea.addEventListener('input', updateCharCounter);
        // Appel initial pour mettre le compteur à 0/50
        updateCharCounter();
    }
    
    const launchBtn = document.getElementById('launchDiagnostic');
    if (launchBtn) {
        launchBtn.addEventListener('click', startDiagnostic);
    }
// --- AJOUT DES FONCTIONS MANQUANTES POUR LE HTML ---

/**
 * Cette fonction fait le lien avec l'événement 'oninput' de votre HTML
 * qui cherche "checkCanLaunch()"
 */
function checkCanLaunch() {
    debugLog("Vérification de l'état du bouton de lancement...");
    // On appelle la fonction de validation existante
    if (typeof validateForm === "function") {
        validateForm();
    }
}

/**
 * Sécurité pour la variable 'S' si c'était une erreur de copier-coller
 * ou un résidu de bibliothèque.
 */
var S = S || {};
// --- CORRECTIFS FINAUX ---

// 1. Correction pour l'erreur checkCanLaunch appelée par le HTML
function checkCanLaunch() {
    // Cette fonction appelle simplement votre logique de validation existante
    if (typeof validateForm === "function") {
        validateForm();
    }
}

// 2. Correction pour l'erreur "S is not defined" au cas où elle est nécessaire ailleurs
var S = S || {}; 

debugLog("Correctifs de compatibilité chargés.");