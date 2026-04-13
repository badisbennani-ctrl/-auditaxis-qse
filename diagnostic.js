// ============================================
// DIAGNOSTIC IA - AUDITAXIS QSE
// Analyse via API backend (Gemini)
// ============================================

// Configuration API
const API_BASE = 'https://auditaxis-backend-4g3g.onrender.com';
const API_RATE_LIMIT_MS = 10000; // 10 secondes entre chaque appel API
const LAST_API_CALL_KEY = 'auditaxis_last_api_call';

// Hide loading bar after page loads
window.addEventListener('load', function() {
    setTimeout(function() {
        document.getElementById('loadingBar').classList.add('hidden');
    }, 500);
});

// Vérification silencieuse de l'état du serveur au chargement
document.addEventListener('DOMContentLoaded', function() {
    wakeUpBackend();
});

// Fonction pour réveiller le serveur (Render free tier s'endort après 15min)
async function wakeUpBackend() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
        const response = await fetch(`${API_BASE}/api/health`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            console.log('✅ Serveur réveillé avec succès');
        }
    } catch (error) {
        // Silencieux - le serveur sera réveillé au premier vrai appel
        console.log('⏳ Le serveur est en cours de réveil...');
    }
}

// Fonction de vérification de l'état du serveur
async function checkServerHealth() {
    const startTime = performance.now();

    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (response.ok) {
            const data = await response.json();

            if (responseTime > 3000) {
                console.log(`🐌 Serveur froid détecté (${responseTime.toFixed(0)}ms) - Le premier diagnostic prendra plus de temps`);
                window.serverStatus = 'cold';
            } else if (responseTime < 1000) {
                console.log(`⚡ Serveur chaud (${responseTime.toFixed(0)}ms) - Prêt pour l'analyse`);
                window.serverStatus = 'hot';
            } else {
                console.log(`🔄 Serveur en réveil (${responseTime.toFixed(0)}ms)`);
                window.serverStatus = 'warming';
            }
        }
    } catch (error) {
        // Silencieux - pas d'erreur affichée à l'utilisateur
        console.log('🔌 Serveur backend indisponible ou hors ligne');
        window.serverStatus = 'offline';
    }
}

// Variables globales
let selectedNorm = null;
const MIN_CHARS = 50;

// ============================================
// BASE DE CONNAISSANCES ISO
// ============================================
const NORMES = {
    iso9001: {
        nom: "ISO 9001:2015",
        regles: [
            {
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "parties intéressées", "environnement", "stakeholder", "pne"],
                article: "Art. 4.1 & 4.2",
                titre: "Contexte de l'organisme",
                conformite: "Contexte et parties intéressées identifiés",
                explication: "L'organisme doit déterminer les enjeux externes et internes pertinents et identifier les parties intéressées et leurs exigences."
            },
            {
                motsCles: ["domaine application", "périmètre", "champ application", "système management qualité", "smq", "limites"],
                article: "Art. 4.3 & 4.4",
                titre: "Domaine d'application du SMQ",
                conformite: "Domaine d'application défini et documenté",
                explication: "L'organisme doit déterminer les limites et l'applicabilité du SMQ et établir les processus nécessaires."
            },
            {
                motsCles: ["leadership", "direction", "engagement direction", "management", "dirigeant", "responsabilité direction"],
                article: "Art. 5.1",
                titre: "Leadership et engagement de la direction",
                conformite: "Leadership et engagement de la direction démontré",
                explication: "La direction doit démontrer son leadership en assumant la responsabilité de l'efficacité du SMQ et en fournissant les ressources nécessaires."
            },
            {
                motsCles: ["politique qualité", "politique", "orientation client", "satisfaction client", "client", "engagement client"],
                article: "Art. 5.2 & 5.1.2",
                titre: "Politique qualité et orientation client",
                conformite: "Politique qualité établie et orientée client",
                explication: "La direction doit établir une politique qualité appropriée au contexte et s'assurer que les exigences client sont comprises et satisfaites."
            },
            {
                motsCles: ["rôles", "responsabilités", "autorités", "fonctions", "organigramme", "responsable qualité"],
                article: "Art. 5.3",
                titre: "Rôles et responsabilités",
                conformite: "Rôles et responsabilités définis et communiqués",
                explication: "La direction doit attribuer les responsabilités et autorités pour les rôles pertinents du SMQ."
            },
            {
                motsCles: ["risque", "opportunité", "évaluation risque", "action préventive", "gestion risque", "analyse risque"],
                article: "Art. 6.1",
                titre: "Actions face aux risques et opportunités",
                conformite: "Risques et opportunités identifiés et traités",
                explication: "L'organisme doit déterminer les risques et opportunités pouvant affecter la conformité des produits et services."
            },
            {
                motsCles: ["objectif qualité", "objectif", "indicateur", "kpi", "mesure performance", "cible", "tableau bord"],
                article: "Art. 6.2",
                titre: "Objectifs qualité et planification",
                conformite: "Objectifs qualité SMART définis et surveillés",
                explication: "Les objectifs qualité doivent être mesurables, cohérents avec la politique qualité et surveillés régulièrement."
            },
            {
                motsCles: ["ressources humaines", "personnel", "effectif", "recrutement", "infrastructure", "équipement"],
                article: "Art. 7.1",
                titre: "Ressources humaines et infrastructure",
                conformite: "Ressources nécessaires identifiées et fournies",
                explication: "L'organisme doit identifier et fournir les ressources nécessaires pour le SMQ incluant personnel, infrastructure et environnement de travail."
            },
            {
                motsCles: ["compétence", "formation", "qualification", "habilitation", "plan formation", "évaluation"],
                article: "Art. 7.2",
                titre: "Compétences du personnel",
                conformite: "Compétences déterminées et formation assurée",
                explication: "L'organisme doit déterminer les compétences nécessaires et s'assurer que les personnes sont compétentes sur la base de leur formation ou expérience."
            },
            {
                motsCles: ["sensibilisation", "conscience", "communication", "information", "affichage", "réunion"],
                article: "Art. 7.3 & 7.4",
                titre: "Sensibilisation et communication",
                conformite: "Personnel sensibilisé et communication établie",
                explication: "Les personnes doivent être sensibilisées à la politique qualité et l'organisme doit déterminer les besoins de communication interne et externe."
            },
            {
                motsCles: ["document", "procédure", "enregistrement", "instruction", "manuel qualité", "information documentée"],
                article: "Art. 7.5",
                titre: "Informations documentées",
                conformite: "Informations documentées maîtrisées",
                explication: "Le SMQ doit inclure les informations documentées exigées par la norme et celles jugées nécessaires par l'organisme pour l'efficacité du système."
            },
            {
                motsCles: ["processus", "procédure opérationnelle", "production", "prestation service", "fabrication", "opérationnel"],
                article: "Art. 8.1 & 8.5",
                titre: "Maîtrise opérationnelle et production",
                conformite: "Processus opérationnels maîtrisés",
                explication: "L'organisme doit planifier et maîtriser les processus nécessaires pour satisfaire aux exigences de fourniture des produits et services."
            },
            {
                motsCles: ["exigences client", "cahier charges", "commande", "contrat", "réclamation", "retour client", "enquête"],
                article: "Art. 8.2",
                titre: "Exigences relatives aux produits et services",
                conformite: "Exigences client déterminées et satisfaites",
                explication: "L'organisme doit déterminer les exigences relatives aux produits et services et s'assurer de sa capacité à y répondre avant tout engagement."
            },
            {
                motsCles: ["fournisseur", "sous-traitant", "prestataire externe", "achats", "approvisionnement", "évaluation fournisseur"],
                article: "Art. 8.4",
                titre: "Maîtrise des prestataires externes",
                conformite: "Fournisseurs évalués et maîtrisés",
                explication: "L'organisme doit s'assurer que les processus, produits et services fournis par des prestataires externes sont conformes aux exigences."
            },
            {
                motsCles: ["non-conformité", "non conformité", "défaut", "rebut", "écart", "anomalie", "produit non conforme"],
                article: "Art. 8.7 & 10.2",
                titre: "Maîtrise des non-conformités et actions correctives",
                conformite: "Non-conformités identifiées et traitées",
                explication: "L'organisme doit identifier les éléments de sortie non conformes et mener les actions correctives appropriées pour éliminer les causes."
            },
            {
                motsCles: ["surveillance", "mesure", "analyse", "évaluation", "indicateur performance", "données", "statistique"],
                article: "Art. 9.1",
                titre: "Surveillance, mesure et évaluation des performances",
                conformite: "Performances surveillées et mesurées",
                explication: "L'organisme doit déterminer ce qui est nécessaire de surveiller et mesurer pour évaluer la performance et l'efficacité du SMQ."
            },
            {
                motsCles: ["audit interne", "audit", "programme audit", "auditeur", "plan audit", "rapport audit"],
                article: "Art. 9.2",
                titre: "Audit interne",
                conformite: "Programme d'audits internes planifié et réalisé",
                explication: "L'organisme doit réaliser des audits internes à intervalles planifiés pour vérifier la conformité et l'efficacité du SMQ."
            },
            {
                motsCles: ["revue direction", "revue management", "réunion direction", "bilan annuel", "revue système"],
                article: "Art. 9.3",
                titre: "Revue de direction",
                conformite: "Revues de direction planifiées et réalisées",
                explication: "La direction doit procéder à des revues du SMQ à intervalles planifiés pour s'assurer de son adéquation, son efficacité et son alignement stratégique."
            },
            {
                motsCles: ["amélioration continue", "amélioration", "pdca", "action corrective", "action préventive", "progrès"],
                article: "Art. 10.3",
                titre: "Amélioration continue",
                conformite: "Démarche d'amélioration continue en place",
                explication: "L'organisme doit améliorer en continu la pertinence, l'adéquation et l'efficacité du SMQ en utilisant les résultats d'analyse et de la revue de direction."
            }
        ]
    },
    iso14001: {
        nom: "ISO 14001:2015",
        regles: [
            {
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "conditions environnementales", "parties intéressées"],
                article: "Art. 4.1 & 4.2",
                titre: "Contexte et parties intéressées",
                conformite: "Contexte environnemental et parties intéressées identifiés",
                explication: "L'organisme doit déterminer les enjeux externes et internes pertinents incluant les conditions environnementales affectées par ou susceptibles d'affecter l'organisme."
            },
            {
                motsCles: ["domaine application", "périmètre sme", "système management environnemental", "sme", "limites"],
                article: "Art. 4.3 & 4.4",
                titre: "Domaine d'application du SME",
                conformite: "Domaine d'application du SME défini et documenté",
                explication: "L'organisme doit déterminer les limites et l'applicabilité du SME en prenant en compte ses unités organisationnelles, activités, produits et services."
            },
            {
                motsCles: ["leadership", "direction", "engagement direction", "management environnemental", "responsabilité direction"],
                article: "Art. 5.1",
                titre: "Leadership et engagement de la direction",
                conformite: "Leadership et engagement de la direction démontré",
                explication: "La direction doit démontrer son leadership en assumant la responsabilité de l'efficacité du SME et en s'assurant que les ressources requises sont disponibles."
            },
            {
                motsCles: ["politique environnementale", "politique", "protection environnement", "prévention pollution", "engagement environnemental"],
                article: "Art. 5.2",
                titre: "Politique environnementale",
                conformite: "Politique environnementale établie et communiquée",
                explication: "La direction doit établir une politique environnementale incluant l'engagement de protection de l'environnement, la prévention de la pollution et l'amélioration continue."
            },
            {
                motsCles: ["aspect environnemental", "impact environnemental", "aspect significatif", "cycle de vie", "émission", "pollution", "rejet"],
                article: "Art. 6.1.2",
                titre: "Aspects environnementaux significatifs",
                conformite: "Aspects environnementaux identifiés et évalués",
                explication: "L'organisme doit déterminer les aspects environnementaux de ses activités, produits et services dans une perspective de cycle de vie et identifier ceux qui sont significatifs."
            },
            {
                motsCles: ["obligations conformité", "réglementation", "légal", "loi", "permis", "autorisation", "exigences légales"],
                article: "Art. 6.1.3",
                titre: "Obligations de conformité réglementaire",
                conformite: "Obligations de conformité déterminées et respectées",
                explication: "L'organisme doit déterminer et avoir accès à ses obligations de conformité relatives à ses aspects environnementaux incluant lois, réglementations et permis."
            },
            {
                motsCles: ["urgence", "situation urgence", "accident", "déversement", "fuite", "incendie", "plan urgence"],
                article: "Art. 6.1.1 & 8.2",
                titre: "Préparation aux situations d'urgence",
                conformite: "Plan de réponse aux urgences environnementales établi",
                explication: "L'organisme doit identifier les situations d'urgence potentielles ayant un impact environnemental et établir des processus pour y répondre et les tester périodiquement."
            },
            {
                motsCles: ["objectif environnemental", "objectif", "cible", "programme", "indicateur", "mesurable", "performance"],
                article: "Art. 6.2",
                titre: "Objectifs environnementaux et planification",
                conformite: "Objectifs environnementaux mesurables définis",
                explication: "L'organisme doit établir des objectifs environnementaux mesurables, cohérents avec la politique environnementale, surveillés et mis à jour si nécessaire."
            },
            {
                motsCles: ["ressources", "compétence", "formation environnement", "qualification", "personnel environnement"],
                article: "Art. 7.1 & 7.2",
                titre: "Ressources et compétences environnementales",
                conformite: "Ressources et compétences environnementales assurées",
                explication: "L'organisme doit identifier les ressources nécessaires et s'assurer que les personnes dont le travail affecte la performance environnementale sont compétentes."
            },
            {
                motsCles: ["sensibilisation", "conscience environnementale", "communication environnement", "information personnel"],
                article: "Art. 7.3 & 7.4",
                titre: "Sensibilisation et communication environnementale",
                conformite: "Personnel sensibilisé aux aspects environnementaux",
                explication: "Les personnes doivent être sensibilisées à la politique environnementale, aux aspects significatifs et aux impacts associés à leur travail."
            },
            {
                motsCles: ["document", "procédure environnement", "enregistrement", "information documentée", "registre environnemental"],
                article: "Art. 7.5",
                titre: "Informations documentées environnementales",
                conformite: "Documentation environnementale maîtrisée",
                explication: "Le SME doit inclure les informations documentées exigées par la norme et celles jugées nécessaires à l'efficacité du système de management environnemental."
            },
            {
                motsCles: ["déchet", "recyclage", "tri", "élimination", "valorisation", "gestion déchet", "rebut"],
                article: "Art. 8.1",
                titre: "Maîtrise opérationnelle - Gestion des déchets",
                conformite: "Gestion des déchets opérationnelle maîtrisée",
                explication: "L'organisme doit établir des critères opérationnels et maîtriser ses processus liés aux aspects environnementaux significatifs dont la gestion des déchets."
            },
            {
                motsCles: ["énergie", "consommation énergie", "électricité", "eau", "ressource naturelle", "économie énergie"],
                article: "Art. 8.1",
                titre: "Maîtrise opérationnelle - Ressources et énergie",
                conformite: "Consommation des ressources naturelles maîtrisée",
                explication: "L'organisme doit maîtriser ses processus opérationnels liés à l'utilisation des ressources naturelles et de l'énergie dans une perspective de cycle de vie."
            },
            {
                motsCles: ["surveillance", "mesure", "analyse", "évaluation", "indicateur environnemental", "performance environnementale"],
                article: "Art. 9.1",
                titre: "Surveillance et mesure de la performance environnementale",
                conformite: "Performance environnementale surveillée et mesurée",
                explication: "L'organisme doit surveiller, mesurer, analyser et évaluer sa performance environnementale avec des équipements de mesure étalonnés et des indicateurs appropriés."
            },
            {
                motsCles: ["évaluation conformité", "conformité réglementaire", "respect obligations", "vérification légale"],
                article: "Art. 9.1.2",
                titre: "Évaluation de la conformité réglementaire",
                conformite: "Évaluation régulière de la conformité réalisée",
                explication: "L'organisme doit établir des processus pour évaluer périodiquement le respect de ses obligations de conformité et maintenir la connaissance de son état de conformité."
            },
            {
                motsCles: ["audit interne", "audit environnemental", "programme audit", "auditeur", "rapport audit"],
                article: "Art. 9.2",
                titre: "Audit interne environnemental",
                conformite: "Audits internes environnementaux planifiés et réalisés",
                explication: "L'organisme doit réaliser des audits internes à intervalles planifiés pour vérifier la conformité du SME aux exigences de la norme ISO 14001:2015."
            },
            {
                motsCles: ["revue direction", "revue management", "bilan environnemental", "revue système"],
                article: "Art. 9.3",
                titre: "Revue de direction environnementale",
                conformite: "Revues de direction environnementales réalisées",
                explication: "La direction doit procéder à des revues du SME pour s'assurer qu'il est approprié, adapté et efficace, en tenant compte des non-conformités et résultats d'audit."
            },
            {
                motsCles: ["non-conformité", "action corrective", "amélioration", "incident environnemental", "écart environnemental"],
                article: "Art. 10.2 & 10.3",
                titre: "Non-conformités et amélioration continue",
                conformite: "Non-conformités traitées et amélioration continue en place",
                explication: "L'organisme doit réagir aux non-conformités, analyser leurs causes et mettre en œuvre des actions correctives pour améliorer continuellement le SME."
            }
        ]
    },
    iso45001: {
        nom: "ISO 45001:2018",
        regles: [
            {
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "parties intéressées", "enjeux organisationnels"],
                article: "Art. 4.1 & 4.2",
                titre: "Contexte et parties intéressées",
                conformite: "Contexte S&ST et parties intéressées identifiés",
                explication: "L'organisme doit déterminer les enjeux externes et internes pertinents pour sa finalité et identifier les travailleurs et autres parties intéressées ainsi que leurs besoins et attentes en matière de S&ST."
            },
            {
                motsCles: ["périmètre", "domaine application", "périmètre sst", "système management sst", "sms", "limites sst"],
                article: "Art. 4.3 & 4.4",
                titre: "Périmètre et système de management S&ST",
                conformite: "Périmètre du SMS&ST défini et documenté",
                explication: "L'organisme doit déterminer les limites et l'applicabilité du système de management S&ST en prenant en compte les enjeux internes/externes et les activités planifiées. Le périmètre doit être disponible sous forme d'information documentée."
            },
            {
                motsCles: ["leadership", "direction", "engagement direction", "management sst", "responsabilité direction", "directeur", "pdg"],
                article: "Art. 5.1",
                titre: "Leadership et engagement de la direction",
                conformite: "Leadership et engagement de la direction S&ST démontré",
                explication: "La direction doit démontrer son leadership en assumant la pleine responsabilité de la prévention des traumatismes et pathologies, en fournissant les ressources nécessaires et en promouvant une culture favorable à la S&ST."
            },
            {
                motsCles: ["politique sst", "politique santé sécurité", "politique sécurité", "engagement sst", "charte sécurité", "politique s&st"],
                article: "Art. 5.2",
                titre: "Politique de S&ST",
                conformite: "Politique S&ST documentée, communiquée et accessible",
                explication: "La direction doit établir une politique S&ST documentée incluant l'engagement à procurer des conditions sûres et saines, à éliminer les dangers, à satisfaire les exigences légales et à consulter les travailleurs."
            },
            {
                motsCles: ["rôles", "responsabilités", "autorités sst", "organigramme sécurité", "responsable sécurité", "animateur sécurité", "hssse"],
                article: "Art. 5.3",
                titre: "Rôles, responsabilités et autorités S&ST",
                conformite: "Rôles et responsabilités S&ST attribués et communiqués",
                explication: "La direction doit attribuer et communiquer les responsabilités et autorités pour s'assurer que le système de management S&ST est conforme aux exigences et pour rendre compte de sa performance à tous les niveaux."
            },
            {
                motsCles: ["consultation travailleurs", "participation travailleurs", "cse", "chsct", "délégué", "représentant travailleurs", "comité sécurité", "implication personnel"],
                article: "Art. 5.4",
                titre: "Consultation et participation des travailleurs",
                conformite: "Processus de consultation et participation des travailleurs établi",
                explication: "L'organisme doit établir des processus pour la consultation des travailleurs non encadrants sur l'identification des dangers, l'évaluation des risques, les objectifs S&ST et les mesures de prévention. Les obstacles à la participation doivent être identifiés et éliminés."
            },
            {
                motsCles: ["identification danger", "identification des dangers", "danger", "source danger", "analyse danger", "risque professionnel", "document unique", "duer"],
                article: "Art. 6.1.2.1",
                titre: "Identification des dangers",
                conformite: "Processus d'identification continue et proactive des dangers établi",
                explication: "L'organisme doit établir un processus d'identification continue et proactive des dangers couvrant : organisation du travail, facteurs sociaux (harcèlement, charge de travail), activités habituelles et inhabituelles, facteurs humains, événements passés et situations d'urgence potentielles."
            },
            {
                motsCles: ["évaluation risques", "évaluation des risques", "analyse risque", "cotation risque", "niveau risque", "matrice risque", "duer"],
                article: "Art. 6.1.2.2",
                titre: "Évaluation des risques pour la S&ST",
                conformite: "Évaluation des risques S&ST réalisée et documentée",
                explication: "L'organisme doit évaluer les risques S&ST issus des dangers identifiés en tenant compte de l'efficacité des mesures de prévention existantes. Les méthodes et critères d'évaluation doivent être définis, proactifs, systématiques et conservés sous forme documentée."
            },
            {
                motsCles: ["opportunité sst", "opportunité amélioration", "amélioration performance sst", "opportunité sécurité"],
                article: "Art. 6.1.2.3",
                titre: "Évaluation des opportunités S&ST",
                conformite: "Opportunités d'amélioration de la performance S&ST évaluées",
                explication: "L'organisme doit établir un processus pour évaluer les opportunités S&ST permettant d'améliorer la performance, notamment les opportunités d'adaptation du travail aux travailleurs et d'élimination des dangers."
            },
            {
                motsCles: ["exigences légales", "réglementation sst", "conformité réglementaire", "code travail", "décret sécurité", "obligation légale", "veille réglementaire sst"],
                article: "Art. 6.1.3",
                titre: "Exigences légales et autres exigences S&ST",
                conformite: "Exigences légales S&ST déterminées, accessibles et à jour",
                explication: "L'organisme doit établir et tenir à jour un processus pour déterminer les exigences légales et autres exigences applicables à ses dangers et risques S&ST, et s'assurer qu'elles sont prises en compte dans le SMS&ST."
            },
            {
                motsCles: ["plan action sst", "planification actions", "action prévention", "mesure prévention planifiée", "hiérarchie mesures"],
                article: "Art. 6.1.4",
                titre: "Planification des actions S&ST",
                conformite: "Actions S&ST planifiées en intégrant la hiérarchie des mesures",
                explication: "L'organisme doit planifier les actions face aux risques, opportunités et exigences légales en tenant compte de la hiérarchie des mesures de prévention et en les intégrant aux processus opérationnels."
            },
            {
                motsCles: ["objectif sst", "objectif santé sécurité", "indicateur sécurité", "kpi sst", "cible sécurité", "tableau bord sst"],
                article: "Art. 6.2",
                titre: "Objectifs S&ST et planification",
                conformite: "Objectifs S&ST mesurables, surveillés et communiqués",
                explication: "L'organisme doit établir des objectifs S&ST mesurables, cohérents avec la politique S&ST, prenant en compte les résultats d'évaluation des risques et la consultation des travailleurs. Un plan d'action doit définir le responsable, les ressources, l'échéance et les indicateurs de suivi."
            },
            {
                motsCles: ["ressources sst", "infrastructure sécurité", "moyens sécurité", "budget sst", "équipement sécurité"],
                article: "Art. 7.1",
                titre: "Ressources S&ST",
                conformite: "Ressources nécessaires au SMS&ST identifiées et fournies",
                explication: "L'organisme doit identifier et fournir les ressources humaines, matérielles et financières nécessaires à l'établissement, la mise en œuvre, la tenue à jour et l'amélioration continue du système de management S&ST."
            },
            {
                motsCles: ["compétence sst", "formation sécurité", "habilitation", "qualification sécurité", "plan formation sst", "recyclage sécurité", "formé sst"],
                article: "Art. 7.2",
                titre: "Compétences S&ST",
                conformite: "Compétences S&ST déterminées et preuves de formation conservées",
                explication: "L'organisme doit déterminer les compétences S&ST requises, s'assurer que les travailleurs sont compétents pour identifier les dangers, et conserver des informations documentées comme preuves de formation et d'expérience."
            },
            {
                motsCles: ["sensibilisation sst", "prise de conscience", "droit retrait", "communication sécurité", "affichage sécurité", "information travailleurs sst"],
                article: "Art. 7.3 & 7.4",
                titre: "Sensibilisation et communication S&ST",
                conformite: "Travailleurs sensibilisés et communication S&ST établie",
                explication: "Les travailleurs doivent être sensibilisés à la politique S&ST, aux dangers et risques les concernant, aux conséquences du non-respect des exigences et à leur droit de retrait face à un danger grave et imminent. Des processus de communication interne et externe doivent être établis."
            },
            {
                motsCles: ["information documentée sst", "document sécurité", "procédure sst", "enregistrement sécurité", "registre sst", "instruction sécurité"],
                article: "Art. 7.5",
                titre: "Informations documentées S&ST",
                conformite: "Informations documentées S&ST maîtrisées et accessibles",
                explication: "Le SMS&ST doit inclure les informations documentées exigées par la norme et celles jugées nécessaires à son efficacité. Elles doivent être protégées, accessibles aux travailleurs et maîtrisées en termes de version."
            },
            {
                motsCles: ["maîtrise opérationnelle", "processus opérationnel sst", "critères opérationnels", "adaptation travail"],
                article: "Art. 8.1.1",
                titre: "Planification et maîtrise opérationnelles S&ST",
                conformite: "Processus opérationnels S&ST planifiés et maîtrisés",
                explication: "L'organisme doit planifier, mettre en œuvre et maîtriser les processus nécessaires au SMS&ST en établissant des critères opérationnels et en adaptant le travail aux travailleurs."
            },
            {
                motsCles: ["epi", "équipement protection individuelle", "casque", "gants", "chaussures sécurité", "masque", "gilet", "harnais", "protection collective", "hiérarchie prévention", "élimination danger", "substitution", "mesure collective"],
                article: "Art. 8.1.2",
                titre: "Hiérarchie des mesures de prévention",
                conformite: "Hiérarchie des mesures de prévention appliquée",
                explication: "L'organisme doit éliminer les dangers et réduire les risques S&ST en appliquant la hiérarchie suivante : 1. Élimination du danger 2. Substitution par procédés moins dangereux 3. Mesures de protection collective 4. Mesures administratives incluant la formation 5. EPI en dernier recours."
            },
            {
                motsCles: ["pilotage changement", "gestion changement", "modification organisation", "nouveau équipement", "changement processus", "réorganisation"],
                article: "Art. 8.1.3",
                titre: "Pilotage du changement",
                conformite: "Processus de pilotage du changement établi et appliqué",
                explication: "L'organisme doit établir un processus pour évaluer les risques S&ST avant tout changement temporaire ou permanent (nouveaux produits, réorganisation, nouvelles exigences légales, évolution technologique) afin d'en limiter les effets négatifs."
            },
            {
                motsCles: ["intervenant extérieur", "sous-traitant", "prestataire", "externalisation", "fournisseur sst", "contractant", "entreprise extérieure"],
                article: "Art. 8.1.4",
                titre: "Intervenants extérieurs et externalisation",
                conformite: "Intervenants extérieurs et fonctions externalisées maîtrisés",
                explication: "L'organisme doit coordonner avec ses intervenants extérieurs pour identifier les dangers et maîtriser les risques S&ST liés à leurs activités. Les fonctions externalisées doivent rester conformes aux exigences du SMS&ST."
            },
            {
                motsCles: ["urgence", "situation urgence", "plan urgence", "exercice évacuation", "secours", "incendie", "pompier", "premiers secours", "plan secours"],
                article: "Art. 8.2",
                titre: "Préparation et réponse aux situations d'urgence",
                conformite: "Plan de réponse aux urgences établi, testé et communiqué",
                explication: "L'organisme doit établir des processus de préparation aux situations d'urgence incluant : réponse planifiée avec premiers secours, formation, exercices périodiques d'évaluation, et communication aux travailleurs et parties intéressées."
            },
            {
                motsCles: ["surveillance sst", "mesure performance sst", "indicateur sst", "étalonnage", "suivi sécurité", "monitoring sst", "statistique sécurité"],
                article: "Art. 9.1.1",
                titre: "Surveillance et mesure de la performance S&ST",
                conformite: "Performance S&ST surveillée et mesurée avec équipements étalonnés",
                explication: "L'organisme doit surveiller, mesurer, analyser et évaluer sa performance S&ST, notamment le degré de satisfaction aux exigences légales, l'efficacité des mesures de prévention et les progrès vers les objectifs S&ST."
            },
            {
                motsCles: ["évaluation conformité sst", "conformité légale sst", "respect réglementation sst", "vérification légale sst"],
                article: "Art. 9.1.2",
                titre: "Évaluation de la conformité S&ST",
                conformite: "Conformité aux exigences légales S&ST évaluée et documentée",
                explication: "L'organisme doit établir un processus pour évaluer périodiquement la conformité aux exigences légales et autres exigences S&ST, agir en cas d'écart et conserver les résultats des évaluations sous forme documentée."
            },
            {
                motsCles: ["audit interne sst", "audit sécurité", "programme audit sst", "auditeur sst", "rapport audit sst", "plan audit sécurité"],
                article: "Art. 9.2",
                titre: "Audit interne S&ST",
                conformite: "Audits internes S&ST planifiés et réalisés par auditeurs impartiaux",
                explication: "L'organisme doit réaliser des audits internes S&ST à intervalles planifiés pour vérifier la conformité du SMS&ST. Les auditeurs doivent être impartiaux. Les résultats doivent être rapportés à la direction et aux travailleurs concernés."
            },
            {
                motsCles: ["revue direction sst", "revue management sst", "bilan sécurité", "revue système sst", "réunion direction sécurité"],
                article: "Art. 9.3",
                titre: "Revue de direction S&ST",
                conformite: "Revues de direction S&ST planifiées et réalisées",
                explication: "La direction doit procéder à des revues du SMS&ST à intervalles planifiés en examinant : l'état des actions précédentes, les enjeux internes/externes, la performance S&ST, les résultats d'audit, les ressources et les opportunités d'amélioration continue."
            },
            {
                motsCles: ["accident", "incident", "événement indésirable", "non-conformité sst", "at", "accident travail", "blessure", "presque accident", "action corrective sst"],
                article: "Art. 10.2",
                titre: "Événements indésirables, non-conformités et actions correctives",
                conformite: "Accidents et non-conformités analysés avec actions correctives documentées",
                explication: "L'organisme doit réagir rapidement aux événements indésirables et non-conformités, analyser leurs causes fondamentales, mettre en œuvre des actions correctives proportionnées selon la hiérarchie des mesures de prévention et évaluer leur efficacité."
            },
            {
                motsCles: ["amélioration continue sst", "amélioration sst", "progrès sécurité", "culture sécurité", "culture sst", "pdca sst"],
                article: "Art. 10.3",
                titre: "Amélioration continue S&ST",
                conformite: "Amélioration continue du SMS&ST en place",
                explication: "L'organisme doit améliorer en continu la pertinence, l'adéquation et l'efficacité du SMS&ST en améliorant la performance S&ST, en promouvant la culture S&ST et la participation des travailleurs, et en communiquant les résultats aux travailleurs."
            }
        ]
    }
};

// ============================================
// FONCTION D'ANALYSE DES NC CITÉES PAR L'UTILISATEUR
// ============================================
function analyserNonConformitesCitees(texte, normeId) {
    const norme = NORMES[normeId];
    if (!norme) return [];

    const texteLower = texte.toLowerCase();
    const ncCitees = [];

    // Termes indiquant une non-conformité citée
    const indicateursNC = [
        "non-conformité", "non conformité", "nonconformité",
        "nc :", "nc:", "écart", "écart :", "écart:",
        "absence de", "absence du", "pas de", "pas du",
        "manque de", "manque du", "non réalisé", "non realise",
        "non établi", "non etabli", "non documenté", "non documente",
        "inexistant", "inexistante", "n'existe pas", "nexiste pas",
        "pas en place", "non mis en place", "non en place",
        "pas fait", "non fait", "pas réalisé", "pas realise",
        "pas de plan", "pas de politique", "pas de procédure",
        "pas de procedure", "pas documenté", "pas documente"
    ];

    // Fonction pour déterminer la gravité
    function determinerGravite(article) {
        const match = article.match(/Art\.\s*(\d+)/);
        if (!match) return 'mineure';
        const numArticle = parseInt(match[1], 10);
        if (numArticle >= 4 && numArticle <= 7) return 'majeure';
        if (numArticle >= 8 && numArticle <= 10) return 'mineure';
        return 'mineure';
    }

    // Fonction pour trouver la phrase contenant une NC
    function extrairePhraseAvecNC(texte, indicateur) {
        // Séparer par virgules, points, points-virgules
        const phrases = texte.split(/[.!?;,]+/);
        for (const phrase of phrases) {
            if (phrase.toLowerCase().includes(indicateur)) {
                return phrase.trim();
            }
        }
        return null;
    }

    // Fonction pour trouver la règle correspondante
    function trouverRegleCorrespondante(phrase, norme) {
        const phraseLower = phrase.toLowerCase();
        let meilleureRegle = null;
        let maxCorrespondances = 0;

        for (const regle of norme.regles) {
            let correspondances = 0;
            for (const motCle of regle.motsCles) {
                if (phraseLower.includes(motCle.toLowerCase())) {
                    correspondances++;
                }
            }
            // Bonus si le titre de la règle est mentionné
            if (phraseLower.includes(regle.titre.toLowerCase())) {
                correspondances += 2;
            }
            if (correspondances > maxCorrespondances) {
                maxCorrespondances = correspondances;
                meilleureRegle = regle;
            }
        }

        return meilleureRegle;
    }

    // Fonction pour générer une solution spécifique
    function genererSolutionSpecifique(regle, norme) {
        const normeNom = norme.nom;
        const article = regle.article;

        // Solutions spécifiques par domaine
        if (article.includes("5.2") && (normeId === 'iso45001' || texteLower.includes("politique sst") || texteLower.includes("politique securite"))) {
            return "Rédiger et faire valider par la direction une politique S&ST documentée, l'afficher sur tous les lieux de travail et la communiquer à l'ensemble des travailleurs.";
        }
        if ((article.includes("6.1.2") || article.includes("6.1.2.2")) && (normeId === 'iso45001' || texteLower.includes("risque") || texteLower.includes("duer"))) {
            return "Mettre à jour le Document Unique d'Évaluation des Risques (DUER), impliquer les travailleurs concernés dans cette mise à jour, dater et signer le document révisé.";
        }
        if (article.includes("7.2") && (texteLower.includes("formation") || texteLower.includes("forme"))) {
            return "Établir un plan de formation S&ST, réaliser les formations requises pour les travailleurs concernés et conserver les attestations comme preuves documentées.";
        }
        if (article.includes("7.5") && (texteLower.includes("document") || texteLower.includes("procedure") || texteLower.includes("procédure"))) {
            return "Établir la documentation requise, la faire valider, la référencer dans le système documentaire et assurer sa disponibilité auprès des personnes concernées.";
        }
        if (article.includes("9.2") && (texteLower.includes("audit") || texteLower.includes("audits"))) {
            return "Établir un programme d'audits internes annuel, former les auditeurs internes, réaliser les audits planifiés et documenter les résultats avec actions correctives.";
        }
        if (article.includes("9.3") && (texteLower.includes("revue") || texteLower.includes("direction"))) {
            return "Organiser une revue de direction formelle avec documentation des entrées (résultats d'audit, performance S&ST, etc.) et des décisions prises.";
        }
        if (article.includes("8.2") && (texteLower.includes("urgence") || texteLower.includes("evacuation") || texteLower.includes("évacuation"))) {
            return "Établir un plan de réponse aux urgences, identifier les situations d'urgence potentielles, organiser des exercices et communiquer les procédures aux travailleurs.";
        }
        if (article.includes("8.1.2") && (texteLower.includes("epi") || texteLower.includes("protection"))) {
            return "Appliquer la hiérarchie des mesures de prévention : éliminer/substituer les dangers d'abord, puis mettre en place des protections collectives, et n'utiliser les EPI qu'en dernier recours après information et formation.";
        }
        if ((article.includes("6.1.3") || article.includes("9.1.2")) && texteLower.includes("legal")) {
            return "Établir un registre des exigences légales applicables, évaluer régulièrement la conformité et maintenir à jour la veille réglementaire.";
        }

        // Solution par défaut basée sur la conformité attendue
        return `Mettre en place et documenter : ${regle.conformite}. Établir un plan d'action avec échéancier et responsable identifié.`;
    }

    // Détecter chaque NC citée
    const phrasesTraitees = new Set();

    for (const indicateur of indicateursNC) {
        if (texteLower.includes(indicateur)) {
            const phrase = extrairePhraseAvecNC(texte, indicateur);
            if (phrase && !phrasesTraitees.has(phrase.toLowerCase())) {
                phrasesTraitees.add(phrase.toLowerCase());

                // Trouver la règle correspondante
                const regle = trouverRegleCorrespondante(phrase, norme);

                if (regle) {
                    const gravite = determinerGravite(regle.article);
                    const solution = genererSolutionSpecifique(regle, norme);

                    ncCitees.push({
                        article: regle.article,
                        titre: `🔴 NC citée par l'auditeur`,
                        probleme: `"${phrase}"`,
                        explication: regle.explication || `Selon ${regle.article} de la norme ${norme.nom}, ${regle.conformite}.`,
                        gravite: gravite,
                        action_corrective: solution,
                        estNCCitee: true // Flag pour l'affichage spécial
                    });
                }
            }
        }
    }

    return ncCitees;
}

// ============================================
// FONCTION D'ANALYSE LOCALE - RAISONNEMENT À 3 NIVEAUX AVEC IA CONTEXTUELLE
// ============================================

// Configuration des secteurs d'activité
const SECTEURS = {
    industrie: {
        motsCles: ["usine", "production", "machine", "atelier", "industriel", "fabrication", "ligne production", "assemblage"],
        risque: "eleve",
        label: "Industrie"
    },
    service: {
        motsCles: ["relation client", "service client", "prestation", "bureau", "administratif", "conseil", "tertiaire"],
        risque: "faible",
        label: "Service"
    },
    btp: {
        motsCles: ["chantier", "travaux", "site", "construction", "bâtiment", "ouvrage", "maçonnerie", "tp"],
        risque: "eleve",
        label: "BTP"
    },
    sante: {
        motsCles: ["hôpital", "patient", "médical", "clinique", "santé", "soin", "établissement santé", "ehpad"],
        risque: "eleve",
        label: "Santé"
    }
};

// Mots critiques pour la sévérité
const MOTS_CRITIQUES = ["accident", "blessure", "incident", "danger", "urgence", "risque grave", "sinistre", "exposition", "contamination"];

// Mots de planification (downgrade)
const MOTS_PLANIFICATION = ["en cours", "prévu", "planifié", "programmé", "envisagé", "bientôt", "prochainement"];

// Mots d'absence totale
const MOTS_ABSENCE = ["jamais", "aucun", "inexistant", "absent", "rien", "pas de", "sans", "néant"];

// Mots positifs pour détection contradictions
const MOTS_POSITIFS = ["bon", "excellent", "satisfaisant", "conforme", "maîtrisé", "efficace", "opérationnel", "validé", "documenté"];

// Mots négatifs pour détection contradictions
const MOTS_NEGATIFS = ["mauvais", "insuffisant", "défaillant", "absent", "nul", "critique", "problème", "échec", "non conforme"];

function analyserTexteLocal(texte, normeId) {
    const norme = NORMES[normeId];
    if (!norme) {
        throw new Error("Norme non reconnue: " + normeId);
    }

    const texteLower = texte.toLowerCase();
    const conformites = [];
    let nonConformites = [];
    let totalPoints = 0;

    // ÉTAPE 0 : Détection du secteur d'activité
    const secteurDetecte = detecterSecteur(texteLower);

    // ÉTAPE 1 : Analyser les NC citées explicitement par l'utilisateur
    const ncCitees = analyserNonConformitesCitees(texte, normeId);

    // Termes indiquant une conformité complète
    const termesPreuve = [
        "documenté", "établi", "à jour", "validé", "signé",
        "affiché", "enregistré", "formalisé", "approuvé",
        "mis en œuvre", "réalisé", "effectué", "certifié",
        "vérifié", "archivé", "disponible", "communiqué"
    ];

    // Termes indiquant une conformité partielle
    const termesPartiel = [
        "pas encore", "en cours", "prévu", "à faire", "manque",
        "absent", "non réalisé", "insuffisant", "partiel",
        "incomplet", "ébauche", "projet", "envisagé", "parfois"
    ];

    // Fonction pour déterminer la gravité en fonction du numéro d'article et du contexte
    function determinerGravite(article, contexteTexte) {
        const match = article.match(/Art\.\s*(\d+)/);
        if (!match) return 'mineure';

        const numArticle = parseInt(match[1], 10);

        // Vérifier présence de mots critiques
        const hasCritique = MOTS_CRITIQUES.some(mot => contexteTexte.includes(mot));
        const hasAbsence = MOTS_ABSENCE.some(mot => contexteTexte.includes(mot));
        const hasPlanification = MOTS_PLANIFICATION.some(mot => contexteTexte.includes(mot));

        // Gravité de base selon article
        let graviteBase;
        if (numArticle >= 4 && numArticle <= 7) {
            graviteBase = 'majeure';
        } else if (numArticle >= 8 && numArticle <= 10) {
            graviteBase = 'mineure';
        } else {
            graviteBase = 'mineure';
        }

        // Ajustement selon contexte
        if (hasCritique || hasAbsence) {
            return 'majeure'; // Forcer MAJEURE pour mots critiques ou absence totale
        }

        if (hasPlanification && graviteBase === 'majeure') {
            return 'mineure'; // Downgrade si élément en cours/planifié
        }

        return graviteBase;
    }

    // Fonction pour vérifier si un terme est présent dans le texte
    function contientTerme(termes) {
        return termes.some(terme => texteLower.includes(terme.toLowerCase()));
    }

    // NÉGATIONS - Liste des mots indiquant une négation
    const NEGATIONS = [
        "pas", "non", "ne sont pas", "pas toutes", "pas encore",
        "jamais", "aucun", "sans", "ne pas", "n'est pas", "n'ont pas",
        "pas de", "aucune", "ni", "absence de", "manque de",
        "insuffisant", "incomplet", "ne sont plus"
    ];

    // Fonction pour détecter si un terme de preuve est précédé d'une négation
    function termeDePreuveAvecNegation(texteLower, termesPreuve) {
        for (const terme of termesPreuve) {
            const termeLower = terme.toLowerCase();
            const index = texteLower.indexOf(termeLower);

            if (index !== -1) {
                // Extraire une fenêtre de 80 caractères AVANT le terme
                const debut = Math.max(0, index - 80);
                const contexteAvant = texteLower.substring(debut, index);

                // Vérifier si une négation est présente dans ce contexte
                const negationDetectee = NEGATIONS.some(negation =>
                    contexteAvant.includes(negation)
                );

                if (negationDetectee) {
                    return true; // Terme de preuve nié détecté
                }
            }
        }
        return false; // Aucune négation détectée
    }

    // Fonction pour compter les occurrences de mots-clés
    function compterMotsCles(motsCles) {
        let count = 0;
        motsCles.forEach(mot => {
            const regex = new RegExp(mot.toLowerCase(), 'g');
            const matches = texteLower.match(regex);
            if (matches) count += matches.length;
        });
        return count;
    }

    // Fonction pour détecter contradictions dans le contexte autour du mot-clé
    function detecterContradiction(regleMotsCles) {
        // Trouver la position du premier mot-clé trouvé
        const motCleIndex = regleMotsCles.reduce((idx, mot) => {
            const i = texteLower.indexOf(mot.toLowerCase());
            return i !== -1 && (idx === -1 || i < idx) ? i : idx;
        }, -1);

        // Si aucun mot-clé trouvé, pas de contradiction possible
        if (motCleIndex === -1) return false;

        // Extraire le contexte de 150 caractères avant et après le mot-clé
        const debut = Math.max(0, motCleIndex - 150);
        const fin = Math.min(texteLower.length, motCleIndex + 150);
        const contexte = texteLower.substring(debut, fin);

        const hasPositif = MOTS_POSITIFS.some(mot => contexte.includes(mot));
        const hasNegatif = MOTS_NEGATIFS.some(mot => contexte.includes(mot));
        return hasPositif && hasNegatif;
    }

    // Fonction pour calculer le score de confiance
    function calculerScoreConfiance(nombreMotsClesDetectes, texte) {
        if (nombreMotsClesDetectes > 3) return { score: 85, niveau: 'élevée' };
        if (nombreMotsClesDetectes >= 1) return { score: 55, niveau: 'moyenne' };
        if (texte.trim().length < 100) return { score: 30, niveau: 'faible', raison: 'texte trop court' };
        return { score: 35, niveau: 'faible', raison: 'peu de mots-clés détectés' };
    }

    // Compteur de mots-clés détectés pour le score de confiance
    let totalMotsClesDetectes = 0;
    let reglesAvecMotCleDetecte = 0;
    let recommandationsAbsenceMessage = false;

    // ÉTAPE 2 : Analyser chaque règle pour détecter conformités et absences
    norme.regles.forEach((regle) => {
        // NIVEAU 1: Vérifier si le mot-clé est présent
        const motCleTrouve = regle.motsCles.some(mot =>
            texteLower.includes(mot.toLowerCase())
        );

        if (motCleTrouve) {
            totalMotsClesDetectes += regle.motsCles.filter(mot => texteLower.includes(mot.toLowerCase())).length;
            reglesAvecMotCleDetecte++;
        }

        // Détection de contradiction pour cette règle
        const contradiction = detecterContradiction(regle.motsCles);

        if (motCleTrouve) {
            // Le mot-clé est trouvé → vérifier les termes de preuve
            const hasTermesPreuve = contientTerme(termesPreuve);
            const hasTermesPartiel = contientTerme(termesPartiel);
            const hasCritique = MOTS_CRITIQUES.some(mot => texteLower.includes(mot));
            const hasAbsence = MOTS_ABSENCE.some(mot => texteLower.includes(mot));

            // Vérifier si un terme de preuve est précédé d'une négation
            const preuveNiee = termeDePreuveAvecNegation(texteLower, termesPreuve);

            if (hasTermesPreuve && !preuveNiee && !hasTermesPartiel && !contradiction) {
                // NIVEAU 1 — CONFORME
                // Mot-clé trouvé + termes de preuve présents + pas de négation + pas de termes partiels + pas de contradiction
                conformites.push({
                    article: regle.article,
                    description: regle.conformite,
                    statut: "conforme"
                });
                totalPoints += 1;
            } else if (preuveNiee) {
                // PREUVE NIÉE — NON CONFORME (ex: "pas documenté", "non réalisé")
                const gravite = determinerGravite(regle.article, texteLower);
                nonConformites.push({
                    article: regle.article,
                    titre: `Non-conformité ${gravite} - ${regle.titre}`,
                    probleme: "Élément mentionné mais explicitement nié ou non réalisé",
                    explication: regle.explication || `Selon ${regle.article}, cet élément doit être pleinement mis en œuvre et effectif.`,
                    gravite: gravite,
                    action_corrective: `Mettre en œuvre effectivement : ${regle.conformite}. Vérifier l'application sur le terrain.`
                });
            } else if (contradiction || (hasTermesPreuve && hasAbsence)) {
                // CONTRADICTION DÉTECTÉE — NON CONFORME MAJEURE
                // Ex: "nous avons une politique qualité mais elle n'est jamais appliquée"
                const gravite = 'majeure';
                nonConformites.push({
                    article: regle.article,
                    titre: `Non-conformité majeure - ${regle.titre}`,
                    probleme: "Contradiction détectée dans la description : élément mentionné mais non appliqué",
                    explication: regle.explication || `Selon ${regle.article}, cet élément doit être pleinement mis en œuvre et effectif.`,
                    gravite: gravite,
                    action_corrective: `Mettre en œuvre effectivement : ${regle.conformite}. Vérifier l'application sur le terrain.`
                });
            } else {
                // NIVEAU 2 — PARTIELLEMENT CONFORME
                // Mot-clé trouvé mais sans termes de preuve OU avec termes partiels
                conformites.push({
                    article: regle.article,
                    description: regle.conformite,
                    statut: "partiel"
                });
                totalPoints += 0.5;

                // Gravité ajustée selon contexte
                const gravite = determinerGravite(regle.article, texteLower);

                // Ajouter aussi une non-conformité
                nonConformites.push({
                    article: regle.article,
                    titre: `Conformité partielle — ${regle.titre}`,
                    probleme: "Élément mentionné mais non formalisé ou incomplet",
                    explication: regle.explication || `Selon ${regle.article}, cet élément doit être documenté et formalisé.`,
                    gravite: gravite,
                    action_corrective: `Formaliser et documenter : ${regle.conformite}`
                });
            }
        }
    });

    // NIVEAU 3 — NON CONFORME PAR ABSENCE
    // Ne créer des NC d'absence que si le texte est suffisamment long et détaillé
    const texteLongueur = texte.trim().length;
    const pourcentageReglesDetectees = (reglesAvecMotCleDetecte / norme.regles.length) * 100;
    const texteSuffisammentLong = texteLongueur > 200;
    const texteSuffisammentDetaille = pourcentageReglesDetectees >= 30;

    if (!texteSuffisammentLong || !texteSuffisammentDetaille) {
        // Texte trop court ou peu détaillé - ne pas créer de NC d'absence
        // Ajouter un message d'avertissement dans les recommandations
        recommandationsAbsenceMessage = true;
    } else {
        // Texte suffisamment long et détaillé - créer des NC d'absence (limité à 5)
        const ncAbsence = [];

        norme.regles.forEach((regle) => {
            const motCleTrouve = regle.motsCles.some(mot =>
                texteLower.includes(mot.toLowerCase())
            );

            if (!motCleTrouve) {
                const gravite = determinerGravite(regle.article, texteLower);
                const explicationDetaillee = regle.explication || `Selon ${regle.article} de la norme ${norme.nom}, cet élément est requis pour la conformité.`;

                ncAbsence.push({
                    article: regle.article,
                    titre: `Non-conformité ${gravite} - ${regle.titre}`,
                    probleme: `Absence totale de l'élément requis : ${regle.conformite}`,
                    explication: `${explicationDetaillee} Le manque de documentation ou de mise en œuvre de cet élément constitue une non-conformité ${gravite}.`,
                    gravite: gravite,
                    action_corrective: `Mettre en place et documenter : ${regle.conformite}. Établir un plan d'action avec échéancier.`,
                    _scoreGravite: gravite === 'majeure' ? 2 : 1 // Pour tri
                });
            }
        });

        // Trier par gravité décroissante et garder les 5 plus critiques
        ncAbsence.sort((a, b) => b._scoreGravite - a._scoreGravite);
        const ncAbsenceLimitees = ncAbsence.slice(0, 5);

        // Supprimer le champ de tri temporaire
        ncAbsenceLimitees.forEach(nc => delete nc._scoreGravite);

        // Ajouter à la FIN de la liste des NC (après les NC partielles/contradictions)
        nonConformites = [...nonConformites, ...ncAbsenceLimitees];
    }

    // Calcul du score de confiance
    const scoreConfiance = calculerScoreConfiance(totalMotsClesDetectes, texte);

    // ÉTAPE 3 : Ajouter les NC citées EN PREMIER dans la liste (avant tout le reste)
    if (ncCitees.length > 0) {
        nonConformites = [...ncCitees, ...nonConformites];
    }

    // Calculer le score avec précision (conforme = 1pt, partiel = 0.5pt)
    const score = Math.round((totalPoints / norme.regles.length) * 100);

    // Déterminer l'appréciation
    let appreciation = "Faible";
    if (score >= 75) appreciation = "Excellent";
    else if (score >= 50) appreciation = "Bon";
    else if (score >= 25) appreciation = "Moyen";

    // Compter les NC majeures et mineures
    const nbMajeures = nonConformites.filter(nc => nc.gravite === 'majeure').length;
    const nbMineures = nonConformites.filter(nc => nc.gravite === 'mineure').length;

    // Générer les recommandations contextualisées
    const recommandations = [];
    const isSecteurRisque = secteurDetecte && SECTEURS[secteurDetecte]?.risque === 'eleve';

    // Ajouter message d'avertissement si texte insuffisant
    if (recommandationsAbsenceMessage) {
        recommandations.push({
            priorite: 'urgent',
            action: '⚠️ Texte insuffisant pour une analyse complète. Décrivez votre situation en détail pour obtenir une analyse exhaustive.',
            benefice: 'Une description détaillée permettra d\'identifier toutes les non-conformités potentielles',
            delai: 'Immédiat - Fournir plus de détails'
        });
    }

    nonConformites.forEach((nc, i) => {
        let priorite;
        let delai;

        if (nc.titre.startsWith("Conformité partielle")) {
            // Recommandation spécifique pour les éléments partiels
            priorite = 'moyen_terme';
            delai = "À planifier sous 90 jours";
        } else {
            // Priorité basée sur gravité ET secteur
            if (nc.gravite === 'majeure') {
                if (isSecteurRisque) {
                    priorite = 'urgent';
                    delai = "À corriger sous 30 jours";
                } else {
                    priorite = 'moyen_terme';
                    delai = "À planifier sous 90 jours";
                }
            } else {
                priorite = i < 2 ? 'moyen_terme' : 'long_terme';
                delai = priorite === 'moyen_terme' ? "À planifier sous 90 jours" : "À intégrer au prochain cycle d'audit";
            }
        }

        recommandations.push({
            priorite: priorite,
            action: nc.action_corrective,
            benefice: `Conformité à ${nc.article} de la norme ${norme.nom} et réduction des risques associés`,
            delai: delai
        });
    });

    return {
        score: score,
        appreciation: appreciation,
        conformites: conformites,
        nonConformites: nonConformites,
        recommandations: recommandations,
        scoreConfiance: scoreConfiance.score,
        niveauConfiance: scoreConfiance.niveau,
        secteurDetecte: secteurDetecte,
        nbMajeures: nbMajeures,
        nbMineures: nbMineures
    };
}

// ============================================
// DÉTECTION DU SECTEUR D'ACTIVITÉ
// ============================================
function detecterSecteur(texteLower) {
    let meilleurSecteur = null;
    let meilleurScore = 0;

    for (const [secteurId, secteurConfig] of Object.entries(SECTEURS)) {
        let score = 0;
        secteurConfig.motsCles.forEach(mot => {
            const regex = new RegExp(mot.toLowerCase(), 'g');
            const matches = texteLower.match(regex);
            if (matches) score += matches.length;
        });

        if (score > meilleurScore) {
            meilleurScore = score;
            meilleurSecteur = secteurId;
        }
    }

    return meilleurSecteur;
}

// ============================================
// GÉNÉRATION DU RÉSUMÉ EXÉCUTIF
// ============================================
function genererResumeExecutif(resultat, normeNom) {
    const { score, appreciation, nbMajeures, nbMineures, secteurDetecte, niveauConfiance } = resultat;

    const secteurLabel = secteurDetecte ? SECTEURS[secteurDetecte]?.label : 'Secteur non détecté';
    const confianceText = `Analyse avec un niveau de confiance ${niveauConfiance.toLowerCase()}`;

    // Générer le top 3 des actions prioritaires
    const actionsPrioritaires = resultat.recommandations
        .filter(r => r.priorite === 'urgent')
        .slice(0, 3)
        .map((r, i) => `${i + 1}. ${r.action}`)
        .join('\n');

    let appreciationDetail;
    if (score >= 75) appreciationDetail = "Très bon niveau de conformité globale";
    else if (score >= 50) appreciationDetail = "Niveau de conformité satisfaisant avec des axes d'amélioration";
    else if (score >= 25) appreciationDetail = "Des améliorations significatives sont nécessaires";
    else appreciationDetail = "Un plan d'action correctif est fortement recommandé";

    return `
<div class="resume-executif" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid var(--primary); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(30, 95, 140, 0.1);">
    <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.2rem;">📋 Résumé Exécutif - ${normeNom}</h3>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
        <div style="background: white; padding: 1rem; border-radius: 6px;">
            <div style="font-size: 0.85rem; color: #666;">Score Global</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${score}%</div>
            <div style="font-size: 0.85rem; color: #666;">${appreciation}</div>
        </div>
        <div style="background: white; padding: 1rem; border-radius: 6px;">
            <div style="font-size: 0.85rem; color: #666;">Non-Conformités</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-red);">${nbMajeures}</div>
            <div style="font-size: 0.85rem; color: #666;">majeures</div>
        </div>
        <div style="background: white; padding: 1rem; border-radius: 6px;">
            <div style="font-size: 0.85rem; color: #666;">Non-Conformités</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">${nbMineures}</div>
            <div style="font-size: 0.85rem; color: #666;">mineures</div>
        </div>
        <div style="background: white; padding: 1rem; border-radius: 6px;">
            <div style="font-size: 0.85rem; color: #666;">Secteur Détecté</div>
            <div style="font-size: 1rem; font-weight: bold; color: var(--secondary);">${secteurLabel}</div>
            <div style="font-size: 0.85rem; color: #666;">Confiance: ${niveauConfiance}</div>
        </div>
    </div>

    <p style="color: #333; line-height: 1.6; margin-bottom: 1rem;">
        ${appreciationDetail}. ${confianceText}.
        ${nbMajeures > 0 ? `<strong style="color: var(--accent-red);">Attention : ${nbMajeures} non-conformité(s) majeure(s) détectée(s)</strong> nécessitant une action corrective rapide.` : ''}
    </p>

    ${actionsPrioritaires ? `
    <div style="background: #fef3c7; border-left: 3px solid var(--accent); padding: 1rem; border-radius: 4px;">
        <div style="font-weight: bold; color: #92400e; margin-bottom: 0.5rem;">⚡ Top Actions Prioritaires (URGENT)</div>
        <div style="font-size: 0.9rem; color: #78350f;">${actionsPrioritaires}</div>
    </div>
    ` : ''}
</div>
`;
}

// ============================================
// SÉLECTION DE LA NORME
// ============================================
function selectNorm(element) {
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.norm-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ajouter la classe active au bouton cliqué
    element.classList.add('active');

    // Stocker la norme sélectionnée
    selectedNorm = element.getAttribute('data-norm');

    // Vérifier si on peut activer le bouton de lancement
    checkCanLaunch();
}

// ============================================
// COMPTEUR DE CARACTÈRES
// ============================================
function updateCharCounter() {
    const textarea = document.getElementById('situation');
    const counter = document.getElementById('charCounter');
    const length = textarea.value.length;

    counter.textContent = `${length} / ${MIN_CHARS} caractères minimum`;

    if (length >= MIN_CHARS) {
        counter.classList.remove('invalid');
        counter.classList.add('valid');
    } else {
        counter.classList.remove('valid');
        counter.classList.add('invalid');
    }

    checkCanLaunch();
}

// ============================================
// VÉRIFICATION BOUTON LANCEMENT
// ============================================
function checkCanLaunch() {
    const textarea = document.getElementById('situation');
    const launchBtn = document.getElementById('launchBtn');

    if (selectedNorm && textarea.value.length >= MIN_CHARS) {
        launchBtn.disabled = false;
        launchBtn.classList.add('animate');
    } else {
        launchBtn.disabled = true;
        launchBtn.classList.remove('animate');
    }
}

// ============================================
// LANCER LE DIAGNOSTIC
// ============================================

// Fonction de vérification du rate limiting
function checkRateLimit() {
    const now = Date.now();
    const lastCall = localStorage.getItem(LAST_API_CALL_KEY);

    if (lastCall) {
        const timeSinceLastCall = now - parseInt(lastCall, 10);
        if (timeSinceLastCall < API_RATE_LIMIT_MS) {
            const remainingSec = Math.ceil((API_RATE_LIMIT_MS - timeSinceLastCall) / 1000);
            return { allowed: false, remainingSec };
        }
    }

    return { allowed: true, remainingSec: 0 };
}

// Fonction pour enregistrer l'appel API
function recordApiCall() {
    localStorage.setItem(LAST_API_CALL_KEY, Date.now().toString());
}

async function launchDiagnostic() {
    const rateLimitMsg = document.getElementById('rateLimitMsg');

    if (!selectedNorm) {
        if (rateLimitMsg) {
            rateLimitMsg.textContent = 'Veuillez sélectionner une norme ISO';
            rateLimitMsg.style.display = 'block';
        }
        return;
    }

    const situation = document.getElementById('situation').value;
    if (situation.length < MIN_CHARS) {
        if (rateLimitMsg) {
            rateLimitMsg.textContent = `Veuillez décrire votre situation avec au moins ${MIN_CHARS} caractères`;
            rateLimitMsg.style.display = 'block';
        }
        return;
    }

    // Vérification du rate limiting (1 appel / 10s) - uniquement pour l'API backend
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
        if (rateLimitMsg) {
            rateLimitMsg.textContent = `Veuillez patienter ${rateLimit.remainingSec} secondes avant une nouvelle analyse`;
            rateLimitMsg.style.display = 'block';
        }
        return;
    }

    // Cacher le message de rate limit s'il était affiché
    if (rateLimitMsg) {
        rateLimitMsg.style.display = 'none';
    }

    // Masquer les étapes et afficher le loader
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('launchBtn').style.display = 'none';
    const serverStatusMsg = document.getElementById('serverStatusMsg');
    document.getElementById('loader').classList.add('active');

    // Configurer l'affichage du message après 3s si la réponse tarde
    let showConnectionMsg = null;
    if (serverStatusMsg) {
        showConnectionMsg = setTimeout(() => {
            serverStatusMsg.innerHTML = '⏳ Connexion au serveur IA en cours (peut prendre jusqu\'à 30s au premier appel)...';
            serverStatusMsg.style.display = 'block';
            serverStatusMsg.style.color = 'var(--primary)';
            serverStatusMsg.style.padding = '0.8rem';
            serverStatusMsg.style.borderRadius = '8px';
            serverStatusMsg.style.backgroundColor = 'rgba(30, 95, 140, 0.1)';
            serverStatusMsg.style.textAlign = 'center';
            serverStatusMsg.style.marginTop = '1rem';
        }, 3000); // Afficher après 3s
    }

    try {
        // Timeout global de 60s pour le fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 60000); // 60s timeout

        // Appel au backend API
        const normeMap = {
            'ISO 9001': 'ISO 9001:2015',
            'ISO 14001': 'ISO 14001:2015',
            'ISO 45001': 'ISO 45001:2018'
        };

        const response = await fetch(`${API_BASE}/api/diagnostic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
                norme: normeMap[selectedNorm],
                description: situation
            })
        });

        // Annuler l'affichage du message si la réponse est arrivée avant 3s
        if (showConnectionMsg) clearTimeout(showConnectionMsg);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
        }

        const responseData = await response.json();

        // Gérer les deux formats : avec wrapper "data" ou direct
        const data = responseData.data || responseData;
        recordApiCall();

        console.log('📊 Données reçues:', data);

        // Mapper les données du backend vers le format attendu par le frontend
        const result = {
            score: data.score,
            appreciation: getAppreciation(data.score),
            nonConformites: (data.non_conformites || []).map(nc => ({
                titre: nc.titre,
                article: nc.article,
                gravite: nc.gravite.toLowerCase(),
                probleme: nc.probleme,
                explication: nc.explication,
                action_corrective: nc.action_corrective
            })),
            conformites: (data.conformites || []).map(c => ({
                description: c.description,
                article: c.article,
                statut: c.statut.toLowerCase() === 'conforme' ? 'conforme' : 'partiel'
            })),
            recommandations: (data.recommandations || []).map(r => ({
                action: r.action,
                priorite: mapPriorite(r.priorite),
                benefice: r.benefice
            }))
        };

        // Masquer le message de connexion après succès
        if (serverStatusMsg) {
            serverStatusMsg.style.display = 'none';
        }

        displayResults(result);
    } catch (error) {
        // Annuler l'affichage du message si c'était programmé
        if (showConnectionMsg) clearTimeout(showConnectionMsg);

        // Masquer le message de statut serveur dans tous les cas
        if (serverStatusMsg) {
            serverStatusMsg.style.display = 'none';
        }

        // Vérifier si c'est un timeout (AbortError)
        if (error.name === 'AbortError') {
            // Afficher un message d'erreur clair pour le timeout
            if (serverStatusMsg) {
                serverStatusMsg.innerHTML = '❌ Le serveur met trop de temps à répondre (60s). Le serveur IA est peut-être en maintenance. Veuillez réessayer plus tard.';
                serverStatusMsg.style.display = 'block';
                serverStatusMsg.style.color = '#e74c3c';
                serverStatusMsg.style.padding = '0.8rem';
                serverStatusMsg.style.borderRadius = '8px';
                serverStatusMsg.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                serverStatusMsg.style.textAlign = 'center';
                serverStatusMsg.style.marginTop = '1rem';
            }
        }

        // Fallback vers l'analyse locale sur erreur réseau ou timeout
        try {
            const normMap = {'ISO 9001':'iso9001','ISO 14001':'iso14001','ISO 45001':'iso45001'};
            const localResult = analyserTexteLocal(situation, normMap[selectedNorm]);
            displayResults(localResult);
        } catch (localError) {
            // Si l'analyse locale échoue aussi, afficher l'erreur sans alert()
            console.error('Erreur API et analyse locale:', error, localError);
            const errorDisplay = document.getElementById('rateLimitMsg');
            if (errorDisplay) {
                errorDisplay.textContent = '❌ L\'analyse a échoué. Veuillez réessayer.';
                errorDisplay.style.display = 'block';
            }
            resetForm();
        }
    }
}

function getAppreciation(score) {
    if (score < 25) return 'Faible';
    if (score < 50) return 'Moyen';
    if (score < 75) return 'Bon';
    return 'Excellent';
}

function mapPriorite(priorite) {
    const mapping = {
        'URGENT': 'urgent',
        'MOYEN': 'moyen_terme',
        'LONG': 'long_terme'
    };
    return mapping[priorite] || 'moyen_terme';
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================
function displayResults(result) {
    // Masquer le loader
    document.getElementById('loader').classList.remove('active');

    // Afficher les résultats
    const resultsContainer = document.getElementById('results');
    resultsContainer.classList.add('active');

    // Récupérer le texte saisi par l'utilisateur
    const situation = document.getElementById('situation').value;

    // Déterminer le nom de la norme
    const normeNom = NORMES[selectedNorm]?.nom || 'QSE';

    // Vérifier si resumeExecutifContainer existe, sinon le créer et l'insérer en premier
    let resumeContainer = document.getElementById('resumeExecutifContainer');
    if (!resumeContainer) {
        resumeContainer = document.createElement('div');
        resumeContainer.id = 'resumeExecutifContainer';
        // Insérer en premier enfant de resultsContainer
        if (resultsContainer.firstChild) {
            resultsContainer.insertBefore(resumeContainer, resultsContainer.firstChild);
        } else {
            resultsContainer.appendChild(resumeContainer);
        }
    }

    // Créer l'encadré "Situation analysée"
    const situationHTML = `
    <div id="situationAnalysee" style="background: white; border-left: 4px solid var(--primary); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(30, 95, 140, 0.1);">
        <div style="font-weight: 600; color: var(--primary); margin-bottom: 0.75rem; font-size: 1.05rem;">
            📝 Situation analysée
        </div>
        <div style="font-style: italic; color: #555; background: #f8f9fa; padding: 1rem; border-radius: 6px; line-height: 1.6; font-size: 0.95rem;">
            "${situation}"
        </div>
    </div>
    `;

    // Insérer situationAnalysee AVANT resumeExecutifContainer s'il n'existe pas déjà
    let situationEl = document.getElementById('situationAnalysee');
    if (!situationEl) {
        situationEl = document.createElement('div');
        situationEl.innerHTML = situationHTML;
        // Insérer juste avant resumeContainer
        resultsContainer.insertBefore(situationEl.firstChild, resumeContainer);
    } else {
        // Mettre à jour le contenu si existe déjà
        situationEl.innerHTML = situationHTML;
    }

    // Générer et afficher le résumé exécutif
    resumeContainer.innerHTML = genererResumeExecutif(result, normeNom);
    resumeContainer.style.display = 'block';

    // Mettre à jour le score avec animation
    animateScore(result.score, result.appreciation);

    // Afficher les non-conformités
    displayNonConformites(result.nonConformites);

    // Afficher les conformités
    displayConformites(result.conformites);

    // Afficher les recommandations
    displayRecommandations(result.recommandations);

    // Scroll vers les résultats
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// ANIMATION DU SCORE
// ============================================
function animateScore(score, appreciation) {
    const scoreValue = document.getElementById('scoreValue');
    const progressCircle = document.getElementById('progressCircle');
    const appreciationEl = document.getElementById('appreciation');

    // Animation du nombre
    let currentScore = 0;
    const duration = 1500;
    const increment = score / (duration / 20);

    const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= score) {
            currentScore = score;
            clearInterval(timer);
        }
        scoreValue.textContent = Math.floor(currentScore);
    }, 20);

    // Animation de la jauge circulaire
    const circumference = 2 * Math.PI * 65; // 2πr
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => {
        progressCircle.style.strokeDashoffset = offset;
    }, 100);

    // Appréciation
    const appreciationClass = getAppreciationClass(score);
    appreciationEl.textContent = appreciation;
    appreciationEl.className = 'appreciation ' + appreciationClass;
}

function getAppreciationClass(score) {
    if (score < 25) return 'faible';
    if (score < 50) return 'moyen';
    if (score < 75) return 'bon';
    return 'excellent';
}

// ============================================
// AFFICHAGE NON-CONFORMITÉS
// ============================================
function displayNonConformites(nonConformites) {
    const container = document.getElementById('nonConformitesList');

    if (!nonConformites || nonConformites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <p>Aucune non-conformité détectée !</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Votre système semble conforme à la norme sélectionnée.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = nonConformites.map(nc => {
        // Style spécial pour les NC citées par l'utilisateur
        if (nc.estNCCitee) {
            return `
            <div class="result-item" style="border-left: 4px solid #e74c3c; background: linear-gradient(135deg, #fff5f5, #ffe8e8); box-shadow: 0 4px 15px rgba(231, 76, 60, 0.15);">
                <div class="result-item-header">
                    <span class="result-item-title" style="color: #c0392b; font-weight: 600;">🔴 NC citée par l'auditeur</span>
                    <span class="gravite-badge ${nc.gravite}" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">${nc.gravite.toUpperCase()}</span>
                </div>
                <div style="font-style: italic; color: #7f8c8d; font-size: 1rem; margin: 0.75rem 0; padding: 0.75rem; background: white; border-radius: 8px; border-left: 3px solid #e74c3c;">
                    "${nc.probleme}"
                </div>
                <div class="article-reference" style="font-weight: 600; color: #2c3e50;">📋 Référence normative : ${nc.article}</div>
                <div class="result-explication" style="margin-top: 0.75rem;">
                    <strong style="color: #2c3e50;">📖 Exigence de la norme :</strong><br>
                    <span style="color: #555; line-height: 1.6;">${nc.explication}</span>
                </div>
                <div class="action-corrective" style="margin-top: 1rem; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-left: 3px solid #28a745;">
                    <div class="action-corrective-label" style="color: #155724; font-weight: 600;">✓ Solution recommandée</div>
                    <span style="color: #1e7e34;">${nc.action_corrective}</span>
                </div>
            </div>
            `;
        }

        // Affichage standard pour les autres NC
        return `
        <div class="result-item ${nc.gravite}">
            <div class="result-item-header">
                <span class="result-item-title">${nc.titre}</span>
                <span class="gravite-badge ${nc.gravite}">${nc.gravite.toUpperCase()}</span>
            </div>
            <div class="article-reference">${nc.article}</div>
            <div class="result-description">${nc.probleme}</div>
            <div class="result-explication">
                <strong>Pourquoi c'est une non-conformité :</strong><br>
                ${nc.explication}
            </div>
            <div class="action-corrective">
                <div class="action-corrective-label">✓ Action corrective recommandée</div>
                ${nc.action_corrective}
            </div>
        </div>
    `;
    }).join('');
}

// ============================================
// AFFICHAGE CONFORMITÉS
// ============================================
function displayConformites(conformites) {
    const container = document.getElementById('conformitesList');

    if (!conformites || conformites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Pas de points de conformité identifiés dans la description.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Ajoutez plus de détails sur vos pratiques.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = conformites.map(c => {
        const badgeClass = c.statut === 'conforme' ? 'conforme' : 'partiel';
        const badgeText = c.statut === 'conforme' ? '✓ Conforme' : '⚠ Partiel';
        const badgeStyle = c.statut === 'conforme'
            ? 'background: linear-gradient(135deg, #2e8b57, #3cb371);'
            : 'background: linear-gradient(135deg, #e67e22, #f39c12);';

        return `
        <div class="result-item ${c.statut === 'conforme' ? 'conforme' : ''}">
            <div class="result-item-header">
                <span class="result-item-title">${c.description}</span>
                <span class="gravite-badge" style="${badgeStyle} color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">${badgeText}</span>
            </div>
            <div class="article-reference">Référence : ${c.article}</div>
        </div>
    `;
    }).join('');
}

// ============================================
// AFFICHAGE RECOMMANDATIONS
// ============================================
function displayRecommandations(recommandations) {
    const container = document.getElementById('recommandationsList');

    if (!recommandations || recommandations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>Aucune recommandation spécifique.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Continuez à maintenir votre niveau de conformité.</p>
            </div>
        `;
        return;
    }

    // Trier par priorité
    const priorityOrder = { 'urgent': 1, 'moyen_terme': 2, 'long_terme': 3 };
    const sorted = [...recommandations].sort((a, b) => priorityOrder[a.priorite] - priorityOrder[b.priorite]);

    const priorityLabels = {
        'urgent': 'Urgent',
        'moyen_terme': 'Moyen terme',
        'long_terme': 'Long terme'
    };

    container.innerHTML = sorted.map(r => `
        <div class="result-item recommandation">
            <div class="result-item-header">
                <span class="result-item-title">${r.action}</span>
                <span class="priorite-badge ${r.priorite}">${priorityLabels[r.priorite]}</span>
            </div>
            <div class="benefice">
                <div class="benefice-label">💡 Bénéfice attendu</div>
                ${r.benefice}
            </div>
        </div>
    `).join('');
}

// ============================================
// NOUVEAU DIAGNOSTIC
// ============================================
function newDiagnostic() {
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    // Réinitialiser toutes les variables
    selectedNorm = null;

    // Réinitialiser les boutons de norme
    document.querySelectorAll('.norm-btn').forEach(btn => btn.classList.remove('active'));

    // Réinitialiser le textarea
    document.getElementById('situation').value = '';
    document.getElementById('charCounter').textContent = `0 / ${MIN_CHARS} caractères minimum`;
    document.getElementById('charCounter').className = 'char-counter';

    // Réinitialiser le bouton de lancement
    document.getElementById('launchBtn').disabled = true;
    document.getElementById('launchBtn').classList.remove('animate');

    // Masquer les résultats et afficher les étapes
    document.getElementById('results').classList.remove('active');
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('launchBtn').style.display = 'block';
}

// ============================================
// EXPORT POUR TESTS
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyserTexteLocal, NORMES };
}
