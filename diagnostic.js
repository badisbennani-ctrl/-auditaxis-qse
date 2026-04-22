// ============================================
// DIAGNOSTIC IA - AUDITAXIS QSE
// Analyse via API backend (Gemini)
// ============================================

console.log('🚀 Script Diagnostic.js en cours de chargement...');

// Configuration API
const API_BASE = window.AUDITAXIS_CONFIG ? window.AUDITAXIS_CONFIG.API_BASE_URL : 'https://auditaxis-qse.onrender.com';
const API_RATE_LIMIT_MS = window.AUDITAXIS_CONFIG ? window.AUDITAXIS_CONFIG.DIAGNOSTIC.RATE_LIMIT_MS : 10000;
const LAST_API_CALL_KEY = 'auditaxis_last_api_call';

// Échappement HTML pour prévenir les XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Gestion de la barre de chargement
function hideLoadingBar() {
    console.log('⌛ Tentative de masquage de la barre de chargement...');
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.classList.add('hidden');
        console.log('✅ Barre de chargement masquée');
    }
}

window.addEventListener('load', hideLoadingBar);
// Fallback si load est trop lent
setTimeout(hideLoadingBar, 3000);

// Fonction pour réveiller le serveur (Render free tier s'endort après 15min)
async function wakeUpBackend() {
    console.log('📡 Réveil du backend...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

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
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "environnement externe", "facteurs internes", "contexte organisation", "enjeux stratégiques"],
                article: "Art. 4.1",
                titre: "Compréhension de l'organisme et de son contexte",
                conformite: "Enjeux externes et internes identifiés et surveillés",
                explication: "L'organisme doit déterminer les enjeux externes et internes pertinents par rapport à sa finalité et son orientation stratégique, et surveiller les informations relatives à ces enjeux."
            },
            {
                motsCles: ["parties intéressées", "parties prenantes", "besoins parties", "attentes parties", "exigences parties", "clients exigences", "actionnaires", "fournisseurs parties"],
                article: "Art. 4.2",
                titre: "Compréhension des besoins des parties intéressées",
                conformite: "Parties intéressées identifiées et leurs exigences déterminées",
                explication: "L'organisme doit identifier les parties intéressées pertinentes pour le SMQ et déterminer leurs exigences pertinentes, puis surveiller et revoir ces informations."
            },
            {
                motsCles: ["domaine application", "périmètre smq", "champ application", "limites smq", "applicabilité", "domaine smq", "périmètre qualité"],
                article: "Art. 4.3",
                titre: "Détermination du domaine d'application du SMQ",
                conformite: "Domaine d'application défini, documenté et tenu à jour",
                explication: "L'organisme doit déterminer les limites et l'applicabilité du SMQ en tenant compte des enjeux internes/externes, des exigences des parties intéressées et de ses produits et services."
            },
            {
                motsCles: ["processus smq", "cartographie processus", "interaction processus", "approche processus", "séquence processus", "système management qualité", "mise en oeuvre smq", "processus nécessaires"],
                article: "Art. 4.4",
                titre: "Système de management de la qualité et ses processus",
                conformite: "SMQ établi, mis en œuvre, tenu à jour et amélioré en continu",
                explication: "L'organisme doit établir, mettre en œuvre, tenir à jour et améliorer en continu un SMQ incluant les processus nécessaires, leurs séquences, interactions, ressources, responsabilités et critères de maîtrise."
            },
            {
                motsCles: ["leadership", "engagement direction", "responsabilité direction", "engagement management", "implication direction", "direction smq", "top management", "haute direction"],
                article: "Art. 5.1",
                titre: "Leadership et engagement de la direction",
                conformite: "Leadership et engagement de la direction démontré",
                explication: "La direction doit démontrer son leadership en assumant la responsabilité de l'efficacité du SMQ, en établissant politique et objectifs, en intégrant les exigences SMQ aux processus métiers, et en promouvant l'approche processus et par les risques."
            },
            {
                motsCles: ["orientation client", "satisfaction client", "exigences client", "focus client", "centré client", "besoins clients", "attentes clients", "écoute client"],
                article: "Art. 5.1.2",
                titre: "Orientation client",
                conformite: "Orientation client démontrée et priorité à la satisfaction client",
                explication: "La direction doit s'assurer que les exigences clients et légales sont déterminées et satisfaites, que les risques et opportunités liés à la conformité produits/services sont pris en compte, et que l'amélioration de la satisfaction client reste prioritaire."
            },
            {
                motsCles: ["politique qualité", "politique smq", "engagement qualité", "orientation qualité", "politique documentée", "politique communiquée", "axes qualité"],
                article: "Art. 5.2",
                titre: "Politique qualité",
                conformite: "Politique qualité établie, documentée et communiquée",
                explication: "La direction doit établir une politique qualité appropriée au contexte de l'organisme, fournissant un cadre pour les objectifs qualité, incluant l'engagement de satisfaire aux exigences et d'améliorer en continu le SMQ. Elle doit être disponible comme information documentée et communiquée."
            },
            {
                motsCles: ["rôles responsabilités", "autorités smq", "responsabilités définies", "organigramme", "attribution responsabilités", "fonctions responsabilités", "responsable qualité", "représentant direction"],
                article: "Art. 5.3",
                titre: "Rôles, responsabilités et autorités",
                conformite: "Rôles, responsabilités et autorités attribués et communiqués",
                explication: "La direction doit s'assurer que les responsabilités et autorités pour les rôles pertinents sont attribuées, communiquées et comprises, notamment pour assurer la conformité du SMQ, délivrer les résultats attendus et promouvoir l'orientation client."
            },
            {
                motsCles: ["risques opportunités", "analyse risques", "gestion risques", "identification risques", "traitement risques", "risques smq", "opportunités amélioration", "approche risques", "actions préventives"],
                article: "Art. 6.1",
                titre: "Actions face aux risques et opportunités",
                conformite: "Risques et opportunités identifiés, analysés et traités",
                explication: "L'organisme doit déterminer les risques et opportunités à prendre en compte pour assurer que le SMQ atteint ses résultats, accroître les effets souhaitables, prévenir les effets indésirables et s'améliorer. Les actions doivent être proportionnelles à l'impact potentiel."
            },
            {
                motsCles: ["objectifs qualité", "objectifs smq", "objectifs mesurables", "objectifs smart", "indicateurs qualité", "cibles qualité", "planification objectifs", "objectifs surveillés"],
                article: "Art. 6.2",
                titre: "Objectifs qualité et planification",
                conformite: "Objectifs qualité SMART définis, surveillés et communiqués",
                explication: "L'organisme doit établir des objectifs qualité mesurables, cohérents avec la politique qualité, pertinents pour la conformité et la satisfaction client, surveillés, communiqués et mis à jour. Le plan pour les atteindre doit préciser actions, ressources, responsables, échéances et méthodes d'évaluation."
            },
            {
                motsCles: ["planification modifications", "gestion changements", "maîtrise modifications", "changements planifiés", "modifications smq", "gestion modifications"],
                article: "Art. 6.3",
                titre: "Planification des modifications",
                conformite: "Modifications du SMQ planifiées et maîtrisées",
                explication: "Lorsque des modifications du SMQ sont nécessaires, elles doivent être réalisées de façon planifiée en tenant compte de leur objectif, des conséquences possibles, de l'intégrité du SMQ, de la disponibilité des ressources et des responsabilités."
            },
            {
                motsCles: ["ressources smq", "ressources humaines", "infrastructure", "équipements", "ressources nécessaires", "moyens", "ressources disponibles", "environnement travail", "ressources processus"],
                article: "Art. 7.1",
                titre: "Ressources",
                conformite: "Ressources nécessaires au SMQ identifiées et fournies",
                explication: "L'organisme doit identifier et fournir les ressources nécessaires : ressources humaines, infrastructure (bâtiments, équipements, TIC), environnement de travail (aspects humains et physiques), ressources de surveillance et mesure, et connaissances organisationnelles."
            },
            {
                motsCles: ["étalonnage", "métrologie", "équipements mesure", "traçabilité mesure", "vérification équipements", "instruments mesure", "surveillance mesure ressources", "étalons mesure"],
                article: "Art. 7.1.5",
                titre: "Ressources pour la surveillance et la mesure",
                conformite: "Équipements de mesure étalonnés et traçabilité assurée",
                explication: "L'organisme doit déterminer et fournir les ressources pour assurer des résultats valides et fiables. Les équipements de mesure doivent être étalonnés par rapport à des étalons internationaux/nationaux, identifiés et protégés. Les informations documentées doivent être conservées."
            },
            {
                motsCles: ["connaissances organisationnelles", "knowledge management", "capitalisation connaissances", "gestion connaissances", "savoir faire", "retour expérience", "expertise interne"],
                article: "Art. 7.1.6",
                titre: "Connaissances organisationnelles",
                conformite: "Connaissances organisationnelles déterminées et maintenues",
                explication: "L'organisme doit déterminer les connaissances nécessaires à la mise en œuvre de ses processus et à l'obtention de la conformité produits/services. Ces connaissances doivent être tenues à jour, protégées contre la perte (turn-over) et enrichies par retour d'expérience."
            },
            {
                motsCles: ["compétences", "formation personnel", "qualification personnel", "habilitation", "plan formation", "évaluation compétences", "développement compétences", "formation smq"],
                article: "Art. 7.2",
                titre: "Compétences",
                conformite: "Compétences déterminées, assurées et documentées",
                explication: "L'organisme doit déterminer les compétences nécessaires, s'assurer que le personnel est compétent par formation ou expérience, mener des actions pour acquérir les compétences manquantes et conserver des informations documentées comme preuves de compétences."
            },
            {
                motsCles: ["sensibilisation", "sensibilisation qualité", "conscience qualité", "personnel sensibilisé", "culture qualité", "implication personnel", "sensibilisation politique"],
                article: "Art. 7.3",
                titre: "Sensibilisation",
                conformite: "Personnel sensibilisé à la politique et aux objectifs qualité",
                explication: "L'organisme doit s'assurer que le personnel est sensibilisé à la politique qualité, aux objectifs qualité pertinents, à l'importance de leur contribution au SMQ et aux répercussions d'un non-respect des exigences du SMQ."
            },
            {
                motsCles: ["communication interne", "communication externe", "plan communication", "communication smq", "réunions qualité", "communication processus", "information personnel"],
                article: "Art. 7.4",
                titre: "Communication",
                conformite: "Besoins de communication interne et externe déterminés",
                explication: "L'organisme doit déterminer les besoins de communication interne et externe pertinents pour le SMQ : sujets, moments, destinataires, canaux et émetteurs de la communication."
            },
            {
                motsCles: ["informations documentées", "documentation smq", "procédures documentées", "enregistrements qualité", "documents qualité", "maîtrise documents", "gestion documentaire", "contrôle documents"],
                article: "Art. 7.5",
                titre: "Informations documentées",
                conformite: "Informations documentées créées, mises à jour et maîtrisées",
                explication: "Le SMQ doit inclure les informations documentées exigées par la norme et celles jugées nécessaires à son efficacité. Elles doivent être créées, identifiées, révisées, approuvées, distribuées, protégées, stockées et éliminées selon un processus maîtrisé."
            },
            {
                motsCles: ["planification opérationnelle", "maîtrise opérationnelle", "planification production", "critères processus", "maîtrise production", "planification réalisation", "processes opérationnels"],
                article: "Art. 8.1",
                titre: "Planification et maîtrise opérationnelles",
                conformite: "Processus opérationnels planifiés et maîtrisés",
                explication: "L'organisme doit planifier, mettre en œuvre et maîtriser les processus nécessaires à la fourniture de produits et services en déterminant les exigences, établissant des critères, déterminant les ressources et maîtrisant les modifications prévues et imprévues."
            },
            {
                motsCles: ["exigences client", "communication client", "réclamation client", "retour client", "plainte client", "insatisfaction client", "commande client", "contrat client", "exigences produits services"],
                article: "Art. 8.2",
                titre: "Exigences relatives aux produits et services",
                conformite: "Exigences clients déterminées, revues et satisfaites",
                explication: "La communication avec les clients doit inclure les informations sur produits/services, le traitement des commandes, les retours d'information et réclamations. Les exigences doivent être déterminées, revues avant engagement et documentées."
            },
            {
                motsCles: ["conception développement", "design", "développement produit", "conception produit", "processus conception", "validation conception", "vérification conception", "revue conception"],
                article: "Art. 8.3",
                titre: "Conception et développement",
                conformite: "Processus de conception et développement établi et maîtrisé",
                explication: "L'organisme doit établir un processus de conception et développement incluant : planification, éléments d'entrée (exigences fonctionnelles, légales, réglementaires), maîtrise (revues, vérification, validation), éléments de sortie et gestion des modifications. Les informations documentées doivent être conservées."
            },
            {
                motsCles: ["prestataires externes", "fournisseurs", "sous-traitants", "évaluation fournisseurs", "maîtrise fournisseurs", "achats", "sélection fournisseurs", "surveillance fournisseurs", "externalisation"],
                article: "Art. 8.4",
                titre: "Maîtrise des prestataires externes",
                conformite: "Prestataires externes évalués, sélectionnés et maîtrisés",
                explication: "L'organisme doit s'assurer que les processus, produits et services fournis par des prestataires externes sont conformes. Il doit appliquer des critères d'évaluation et de sélection, définir l'étendue de la maîtrise et communiquer les exigences aux prestataires. Les informations documentées doivent être conservées."
            },
            {
                motsCles: ["production", "prestation service", "maîtrise production", "conditions maîtrisées", "traçabilité", "identification produit", "livraison", "préservation produit", "activités après livraison"],
                article: "Art. 8.5",
                titre: "Production et prestation de service",
                conformite: "Production et prestation de service sous conditions maîtrisées",
                explication: "L'organisme doit mettre en œuvre la production dans des conditions maîtrisées incluant : disponibilité des informations documentées, ressources de surveillance/mesure, identification et traçabilité, protection de la propriété client, préservation des produits et activités après livraison."
            },
            {
                motsCles: ["libération produit", "contrôle final", "acceptation produit", "vérification conformité", "validation produit", "contrôle qualité", "autorisation livraison", "libération service"],
                article: "Art. 8.6",
                titre: "Libération des produits et services",
                conformite: "Dispositions de libération planifiées et mises en œuvre",
                explication: "L'organisme doit mettre en œuvre les dispositions planifiées pour vérifier que les exigences produits/services sont satisfaites avant libération. La libération ne doit pas intervenir avant l'exécution satisfaisante de toutes les dispositions planifiées, sauf autorisation compétente. Les informations documentées doivent inclure preuves de conformité et traçabilité des autorisations."
            },
            {
                motsCles: ["non-conformité produit", "produit non conforme", "élément non conforme", "traitement non-conformité", "rebut", "dérogation", "correction produit", "isolement produit non conforme"],
                article: "Art. 8.7",
                titre: "Maîtrise des éléments de sortie non conformes",
                conformite: "Éléments non conformes identifiés, maîtrisés et traités",
                explication: "L'organisme doit identifier et maîtriser les éléments de sortie non conformes pour empêcher leur utilisation non intentionnelle en menant des actions de correction, isolement, retour ou dérogation. La conformité doit être vérifiée après correction. Les informations documentées doivent décrire la NC et les actions menées."
            },
            {
                motsCles: ["surveillance performance", "mesure performance", "indicateurs performance", "kpi qualité", "évaluation performance", "satisfaction client mesure", "analyse données", "évaluation smq"],
                article: "Art. 9.1",
                titre: "Surveillance, mesure, analyse et évaluation",
                conformite: "Performances surveillées, mesurées, analysées et évaluées",
                explication: "L'organisme doit déterminer ce qu'il est nécessaire de surveiller et mesurer, les méthodes, les moments et les moments d'analyse des résultats. La satisfaction client doit être surveillée. Les résultats doivent être analysés pour évaluer conformité produits, satisfaction client, performance SMQ, efficacité planification et performances prestataires."
            },
            {
                motsCles: ["analyse évaluation données", "analyse résultats", "évaluation données qualité", "exploitation données", "analyse statistique", "tendances qualité", "analyse performances"],
                article: "Art. 9.1.3",
                titre: "Analyse et évaluation",
                conformite: "Données analysées pour évaluer la performance du SMQ",
                explication: "L'organisme doit analyser et évaluer les données issues de la surveillance et mesure pour évaluer la conformité produits, la satisfaction client, la performance du SMQ, l'efficacité de la planification, l'efficacité des actions face aux risques, la performance des prestataires et les besoins d'amélioration."
            },
            {
                motsCles: ["audit interne", "programme audit", "auditeurs internes", "audit smq", "programme audit interne", "planification audit", "résultats audit", "rapport audit interne"],
                article: "Art. 9.2",
                titre: "Audit interne",
                conformite: "Programme d'audits internes planifié, réalisé et documenté",
                explication: "L'organisme doit réaliser des audits internes à intervalles planifiés pour vérifier la conformité du SMQ aux exigences de la norme et à ses propres exigences. Le programme doit couvrir fréquence, méthodes, responsabilités. Les auditeurs doivent être objectifs et impartiaux. Les résultats doivent être rapportés à la direction."
            },
            {
                motsCles: ["revue de direction", "revue management", "comité direction", "bilan direction", "revue smq", "réunion direction qualité", "management review", "revue annuelle"],
                article: "Art. 9.3",
                titre: "Revue de direction",
                conformite: "Revues de direction planifiées et réalisées à intervalles définis",
                explication: "La direction doit procéder à des revues du SMQ à intervalles planifiés pour s'assurer de son adéquation, adaptation et efficacité. Les éléments d'entrée incluent : suivi actions précédentes, performances SMQ, satisfaction client, résultats audits, performances prestataires, adéquation ressources et opportunités d'amélioration."
            },
            {
                motsCles: ["action corrective", "traitement non-conformité", "analyse causes", "causes racines", "correction non-conformité", "réclamation traitement", "élimination causes", "actions correctives smq"],
                article: "Art. 10.2",
                titre: "Non-conformité et action corrective",
                conformite: "Non-conformités traitées et actions correctives mises en œuvre",
                explication: "Lorsqu'une non-conformité se produit, l'organisme doit réagir, évaluer la nécessité d'éliminer les causes, mettre en œuvre les actions, examiner leur efficacité et modifier le SMQ si nécessaire. Les actions correctives doivent être proportionnées aux conséquences. Les informations documentées doivent être conservées."
            },
            {
                motsCles: ["amélioration continue", "amélioration smq", "kaizen", "démarche amélioration", "progrès continu", "amélioration performances", "plan amélioration", "amélioration pertinence"],
                article: "Art. 10.3",
                titre: "Amélioration continue",
                conformite: "Démarche d'amélioration continue établie et opérationnelle",
                explication: "L'organisme doit améliorer en continu la pertinence, l'adéquation et l'efficacité du SMQ en prenant en compte les résultats d'analyse et d'évaluation ainsi que les éléments de sortie de la revue de direction pour identifier besoins et opportunités d'amélioration."
            }
        ]
    },
    iso14001: {
        nom: "ISO 14001:2015",
        regles: [
            {
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "conditions environnementales", "facteurs internes", "contexte organisation", "enjeux stratégiques"],
                article: "Art. 4.1",
                titre: "Compréhension de l'organisme et de son contexte",
                conformite: "Enjeux externes et internes pertinents pour le SME identifiés et surveillés",
                explication: "L'organisme doit déterminer les enjeux externes et internes pertinents par rapport à sa finalité et qui influent sur sa capacité à atteindre les résultats attendus de son SME, incluant les conditions environnementales affectées par l'organisme ou susceptibles de l'affecter."
            },
            {
                motsCles: ["parties intéressées", "parties prenantes", "besoins parties", "attentes parties", "obligations conformité", "exigences légales environnement", "exigences parties"],
                article: "Art. 4.2",
                titre: "Compréhension des besoins et attentes des parties intéressées",
                conformite: "Parties intéressées identifiées, besoins déterminés et obligations de conformité établies",
                explication: "L'organisme doit identifier les parties intéressées pertinentes pour le SME, déterminer leurs besoins et attentes pertinents, puis identifier lesquels deviennent des obligations de conformité."
            },
            {
                motsCles: ["domaine application", "périmètre sme", "champ application", "limites sme", "applicabilité sme", "domaine environnemental", "limites physiques", "unités organisationnelles"],
                article: "Art. 4.3",
                titre: "Détermination du domaine d'application du SME",
                conformite: "Domaine d'application du SME défini, documenté et disponible pour les parties intéressées",
                explication: "L'organisme doit déterminer les limites et l'applicabilité du SME en tenant compte des enjeux internes/externes, des obligations de conformité, de ses unités organisationnelles, fonctions, limites physiques, activités, produits et services, ainsi que de son autorité et capacité de maîtrise."
            },
            {
                motsCles: ["processus sme", "système management environnemental", "mise en oeuvre sme", "processus nécessaires", "interactions processus", "amélioration performance environnementale", "établir sme"],
                article: "Art. 4.4",
                titre: "Système de management environnemental",
                conformite: "SME établi, mis en œuvre, tenu à jour et amélioré en continu",
                explication: "L'organisme doit établir, mettre en œuvre, tenir à jour et améliorer en continu un SME incluant les processus nécessaires et leurs interactions, en prenant en considération les connaissances acquises en 4.1 et 4.2."
            },
            {
                motsCles: ["leadership", "engagement direction", "responsabilité direction", "engagement management", "implication direction", "direction sme", "haute direction", "top management environnement"],
                article: "Art. 5.1",
                titre: "Leadership et engagement",
                conformite: "Leadership et engagement de la direction démontrés pour le SME",
                explication: "La direction doit démontrer son leadership en assumant la responsabilité de l'efficacité du SME, en établissant politique et objectifs compatibles avec l'orientation stratégique, en intégrant les exigences SME aux processus métiers, en assurant les ressources, en promouvant l'amélioration continue et en orientant le personnel."
            },
            {
                motsCles: ["politique environnementale", "politique sme", "engagement environnemental", "prévention pollution", "protection environnement", "politique documentée", "engagements conformité", "politique communiquée"],
                article: "Art. 5.2",
                titre: "Politique environnementale",
                conformite: "Politique environnementale établie, documentée, communiquée et disponible",
                explication: "La direction doit établir une politique environnementale appropriée au contexte, fournissant un cadre pour les objectifs environnementaux, incluant l'engagement de protection de l'environnement (prévention de la pollution), de satisfaction des obligations de conformité et d'amélioration continue du SME. Elle doit être documentée, communiquée en interne et disponible pour les parties intéressées."
            },
            {
                motsCles: ["rôles responsabilités", "autorités sme", "responsabilités définies", "attribution responsabilités", "fonctions responsabilités", "représentant direction", "responsable environnement"],
                article: "Art. 5.3",
                titre: "Rôles, responsabilités et autorités au sein de l'organisme",
                conformite: "Responsabilités et autorités pour le SME attribuées et communiquées",
                explication: "La direction doit s'assurer que les responsabilités et autorités des rôles pertinents sont attribuées et communiquées au sein de l'organisme, notamment pour assurer la conformité du SME aux exigences de la norme et rendre compte de la performance environnementale à la direction."
            },
            {
                motsCles: ["risques opportunités", "analyse risques environnement", "gestion risques sme", "identification risques", "situations urgence", "risques sme", "opportunités environnement", "planification risques"],
                article: "Art. 6.1.1",
                titre: "Actions face aux risques et opportunités — Généralités",
                conformite: "Risques et opportunités liés au SME identifiés, analysés et planifiés",
                explication: "L'organisme doit déterminer les risques et opportunités liés à ses aspects environnementaux, obligations de conformité et autres enjeux, pour assurer que le SME atteint ses résultats, prévenir les effets indésirables et s'inscrire dans une amélioration continue. Les situations d'urgence potentielles à impact environnemental doivent être identifiées."
            },
            {
                motsCles: ["aspects environnementaux", "impacts environnementaux", "identification aspects", "inventaire aspects", "activités produits services", "émissions air", "rejets eau", "déchets", "consommation ressources", "nuisance sonore", "pollution sol", "aspects directs", "aspects indirects"],
                article: "Art. 6.1.2.a",
                titre: "Identification des aspects environnementaux",
                conformite: "Aspects environnementaux liés aux activités, produits et services identifiés",
                explication: "L'organisme doit déterminer les aspects environnementaux de ses activités, produits et services qu'il peut maîtriser et ceux sur lesquels il peut avoir une influence, ainsi que leurs impacts environnementaux associés, en tenant compte d'une perspective de cycle de vie."
            },
            {
                motsCles: ["aspects significatifs", "évaluation aspects", "critères significativité", "priorisation impacts", "analyse environnementale évaluation", "méthodologie évaluation", "critères évaluation", "aes", "impacts majeurs"],
                article: "Art. 6.1.2.b",
                titre: "Détermination des aspects environnementaux significatifs",
                conformite: "Critères d'évaluation établis et aspects significatifs identifiés",
                explication: "L'organisme doit déterminer quels sont les aspects qui ont ou peuvent avoir un impact environnemental significatif (AES) en utilisant des critères établis. Ces aspects doivent être pris en compte pour l'établissement du SME et les objectifs."
            },
            {
                motsCles: ["obligations conformité", "exigences légales", "réglementation environnementale", "permis environnementaux", "licences environnement", "lois environnement", "exigences réglementaires", "conformité légale environnement", "veille réglementaire"],
                article: "Art. 6.1.3",
                titre: "Obligations de conformité",
                conformite: "Obligations de conformité déterminées, accessibles et intégrées au SME",
                explication: "L'organisme doit déterminer et avoir accès à ses obligations de conformité relatives à ses aspects environnementaux (lois, réglementations, permis, accords volontaires), déterminer comment elles s'appliquent, les prendre en compte dans le SME et conserver les informations documentées correspondantes."
            },
            {
                motsCles: ["planification actions", "actions aspects significatifs", "actions obligations conformité", "plan actions environnement", "intégration actions processus", "efficacité actions", "maîtrise risques"],
                article: "Art. 6.1.4",
                titre: "Planification d'actions",
                conformite: "Actions planifiées pour traiter aspects significatifs, obligations et risques",
                explication: "L'organisme doit planifier des actions pour traiter ses aspects environnementaux significatifs, ses obligations de conformité et les risques et opportunités identifiés, puis définir comment intégrer ces actions dans les processus du SME et évaluer leur efficacité."
            },
            {
                motsCles: ["objectifs environnementaux", "objectifs sme", "objectifs mesurables environnement", "cibles environnementales", "objectifs aspects significatifs", "objectifs conformité", "planification objectifs environnement", "politique environnementale cohérence"],
                article: "Art. 6.2.1",
                titre: "Objectifs environnementaux",
                conformite: "Objectifs environnementaux établis, mesurables, surveillés et documentés",
                explication: "L'organisme doit établir des objectifs environnementaux aux fonctions et niveaux concernés, en cohérence avec la politique environnementale, tenant compte des aspects significatifs et obligations de conformité. Ces objectifs doivent être mesurables (si réalisable), surveillés, communiqués et mis à jour."
            },
            {
                motsCles: ["planification atteinte objectifs", "plan actions objectifs environnement", "ressources objectifs", "responsables objectifs", "échéances objectifs", "indicateurs objectifs environnementaux", "évaluation résultats objectifs", "étapes réalisation"],
                article: "Art. 6.2.2",
                titre: "Planification des actions pour atteindre les objectifs environnementaux",
                conformite: "Plan d'actions défini pour atteindre chaque objectif environnemental",
                explication: "L'organisme doit déterminer pour chaque objectif environnemental : ce qui sera fait, les ressources nécessaires, les responsables, les échéances et la façon dont les résultats seront évalués via des indicateurs. Il doit aussi envisager l'intégration de ces actions dans les processus métiers."
            },
            {
                motsCles: ["ressources sme", "ressources humaines environnement", "infrastructure environnement", "ressources nécessaires sme", "moyens sme", "ressources management environnemental", "budget environnement"],
                article: "Art. 7.1",
                titre: "Ressources",
                conformite: "Ressources nécessaires au SME identifiées et fournies",
                explication: "L'organisme doit identifier et fournir les ressources nécessaires à l'établissement, la mise en œuvre, la tenue à jour et l'amélioration continue du SME, incluant ressources humaines, naturelles, infrastructures, technologies et ressources financières."
            },
            {
                motsCles: ["compétences environnement", "formation personnel sme", "qualification personnel environnement", "plan formation sme", "évaluation compétences environnement", "compétences aspects environnementaux", "besoins formation environnement"],
                article: "Art. 7.2",
                titre: "Compétences",
                conformite: "Compétences nécessaires au SME déterminées, assurées et documentées",
                explication: "L'organisme doit déterminer les compétences nécessaires des personnes dont le travail a une incidence sur la performance environnementale et les obligations de conformité, s'assurer de leur compétence, déterminer les besoins de formation et mener des actions pour acquérir les compétences manquantes. Les preuves de compétences doivent être conservées."
            },
            {
                motsCles: ["sensibilisation environnement", "sensibilisation sme", "conscience environnementale", "personnel sensibilisé environnement", "culture environnementale", "sensibilisation politique environnementale", "sensibilisation aspects significatifs", "conséquences non-respect"],
                article: "Art. 7.3",
                titre: "Sensibilisation",
                conformite: "Personnel sensibilisé à la politique, aux aspects significatifs et aux obligations",
                explication: "L'organisme doit s'assurer que les personnes effectuant un travail sous son contrôle sont sensibilisées à la politique environnementale, aux aspects environnementaux significatifs et leurs impacts, à l'importance de leur contribution à l'efficacité du SME et aux répercussions d'un non-respect des exigences du SME."
            },
            {
                motsCles: ["communication interne environnement", "communication externe environnement", "plan communication sme", "communication sme", "communication parties intéressées", "informations environnementales", "répondre communication externe"],
                article: "Art. 7.4",
                titre: "Communication",
                conformite: "Processus de communication interne et externe établis et opérationnels",
                explication: "L'organisme doit établir, mettre en œuvre et tenir à jour des processus de communication interne et externe pertinents pour le SME (sujets, moments, destinataires, canaux), en tenant compte des obligations de conformité et en s'assurant que les informations sont fiables."
            },
            {
                motsCles: ["informations documentées sme", "documentation sme", "procédures documentées environnement", "enregistrements environnement", "documents sme", "maîtrise documents environnement", "gestion documentaire sme", "archivage environnement"],
                article: "Art. 7.5",
                titre: "Informations documentées",
                conformite: "Informations documentées du SME créées, mises à jour et maîtrisées",
                explication: "Le SME doit inclure les informations documentées exigées par la norme et celles jugées nécessaires à son efficacité. Elles doivent être créées avec identification appropriée, révisées et approuvées, puis maîtrisées pour leur disponibilité et protection."
            },
            {
                motsCles: ["planification opérationnelle environnement", "maîtrise opérationnelle sme", "critères opérationnels", "maîtrise processus environnement", "contrôles opérationnels", "maîtrise activités impactantes", "maintien conditions"],
                article: "Art. 8.1.a",
                titre: "Maîtrise opérationnelle des processus",
                conformite: "Processus opérationnels du SME planifiés, maîtrisés et documentés",
                explication: "L'organisme doit établir, mettre en œuvre, maîtriser et tenir à jour les processus nécessaires pour satisfaire aux exigences du SME en établissant des critères opérationnels et en mettant en œuvre la maîtrise des processus conformément à ces critères."
            },
            {
                motsCles: ["perspective cycle de vie", "conception environnementale", "développement durable conception", "écoconception", "impact cycle de vie", "étapes cycle de vie", "conception produits services environnement"],
                article: "Art. 8.1.b",
                titre: "Perspective de cycle de vie en conception",
                conformite: "Exigences environnementales intégrées à la conception et au développement",
                explication: "L'organisme doit s'assurer que ses exigences environnementales sont prises en compte dans le processus de conception et de développement du produit ou du service, en considérant chaque étape du cycle de vie."
            },
            {
                motsCles: ["achats environnementaux", "exigences fournisseurs environnement", "maîtrise sous-traitants environnement", "critères achat durable", "communication fournisseurs environnement", "prestataires externes environnement"],
                article: "Art. 8.1.c",
                titre: "Maîtrise des achats et prestataires externes",
                conformite: "Exigences environnementales communiquées aux prestataires et fournisseurs",
                explication: "L'organisme doit déterminer ses exigences environnementales pour l'achat de produits et services et communiquer ses exigences pertinentes aux fournisseurs externes, y compris les sous-traitants."
            },
            {
                motsCles: ["utilisation fin de vie", "élimination déchets finale", "information impacts utilisation", "transport livraison impacts", "fin de vie produits environnement", "traitement déchets utilisation"],
                article: "Art. 8.1.d",
                titre: "Information sur l'utilisation et la fin de vie",
                conformite: "Informations sur les impacts en fin de vie et utilisation fournies",
                explication: "L'organisme doit envisager la nécessité de fournir des informations sur les impacts environnementaux potentiels significatifs liés au transport, à la livraison, à l'utilisation, au traitement en fin de vie et à l'élimination finale de ses produits et services."
            },
            {
                motsCles: ["situations urgence", "préparation urgence", "réponse urgence", "plan urgence environnement", "accidents environnementaux", "déversements", "incidents environnementaux", "exercices urgence", "tests réponse urgence"],
                article: "Art. 8.2",
                titre: "Préparation et réponse aux situations d'urgence",
                conformite: "Processus de préparation et réponse aux situations d'urgence établis et testés",
                explication: "L'organisme doit établir, mettre en œuvre et tenir à jour des processus pour se préparer et répondre aux situations d'urgence potentielles identifiées, en planifiant des actions préventives, en testant périodiquement les réponses planifiées et en formant le personnel."
            },
            {
                motsCles: ["surveillance performance environnementale", "mesure performance sme", "indicateurs performance environnement", "kpi environnement", "évaluation performance sme", "analyse données environnement", "équipements surveillance étalonnés"],
                article: "Art. 9.1.1",
                titre: "Surveillance, mesure, analyse et évaluation — Généralités",
                conformite: "Performance environnementale surveillée, mesurée, analysée et évaluée",
                explication: "L'organisme doit surveiller, mesurer, analyser et évaluer sa performance environnementale en déterminant ce qu'il faut surveiller, les méthodes, les critères et indicateurs appropriés, et les moments d'analyse. Des équipements étalonnés ou vérifiés doivent être utilisés. Les résultats doivent être communiqués en interne et en externe selon les obligations de conformité."
            },
            {
                motsCles: ["évaluation conformité", "conformité obligations", "vérification conformité légale", "audit conformité", "état conformité", "évaluation exigences légales environnement"],
                article: "Art. 9.1.2",
                titre: "Évaluation de la conformité",
                conformite: "Processus d'évaluation de la conformité établi et mis en œuvre périodiquement",
                explication: "L'organisme doit établir, mettre en œuvre et tenir à jour les processus nécessaires à l'évaluation du respect de ses obligations de conformité, déterminer la fréquence d'évaluation, évaluer la conformité et entreprendre les actions nécessaires, et maintenir la connaissance de son état de conformité. Les résultats doivent être conservés comme informations documentées."
            },
            {
                motsCles: ["audit interne environnement", "programme audit sme", "auditeurs internes sme", "audit sme", "planification audit environnement", "résultats audit environnement", "rapport audit interne sme"],
                article: "Art. 9.2",
                titre: "Audit interne",
                conformite: "Programme d'audits internes du SME planifié, réalisé et documenté",
                explication: "L'organisme doit réaliser des audits internes à intervalles planifiés pour vérifier la conformité du SME aux exigences de la norme et à ses propres exigences, et son efficacité. Le programme doit prendre en compte l'importance environnementale des processus et les résultats des audits précédents. Les auditeurs doivent être objectifs et impartiaux."
            },
            {
                motsCles: ["revue direction environnement", "revue management sme", "bilan direction sme", "revue sme", "réunion direction environnement", "management review environnement", "revue annuelle sme"],
                article: "Art. 9.3",
                titre: "Revue de direction",
                conformite: "Revues de direction du SME planifiées et réalisées à intervalles définis",
                explication: "La direction doit procéder à des revues du SME à intervalles planifiés pour s'assurer de son adéquation, adaptation et efficacité. Les éléments d'entrée incluent : suivi actions précédentes, modifications des enjeux et obligations, niveau de réalisation des objectifs environnementaux, performance environnementale (non-conformités, audits, conformité), adéquation des ressources et communications des parties intéressées."
            },
            {
                motsCles: ["action corrective environnement", "traitement non-conformité sme", "analyse causes environnement", "causes racines sme", "correction non-conformité sme", "impacts environnementaux négatifs correction", "élimination causes sme"],
                article: "Art. 10.2",
                titre: "Non-conformité et actions correctives",
                conformite: "Non-conformités traitées et actions correctives mises en œuvre et évaluées",
                explication: "Lorsqu'une non-conformité se produit, l'organisme doit réagir pour la maîtriser, corriger et atténuer les impacts environnementaux négatifs, analyser les causes, mettre en œuvre les actions correctives, examiner leur efficacité et modifier le SME si nécessaire. Les actions correctives doivent être proportionnelles aux conséquences environnementales."
            },
            {
                motsCles: ["amélioration continue environnement", "amélioration sme", "démarche amélioration environnementale", "progrès continu sme", "amélioration performance environnementale", "plan amélioration sme"],
                article: "Art. 10.3",
                titre: "Amélioration continue",
                conformite: "Démarche d'amélioration continue du SME établie et opérationnelle",
                explication: "L'organisme doit améliorer en continu la pertinence, l'adéquation et l'efficacité du SME afin d'améliorer sa performance environnementale, en s'appuyant sur les résultats d'analyse et d'évaluation, d'évaluation de conformité, d'audits internes et de revues de direction."
            }
        ]
    },
    iso45001: {
        nom: "ISO 45001:2018",
        regles: [
            {
                motsCles: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "facteurs SST", "contexte organisation"],
                article: "Art. 4.1",
                titre: "Compréhension de l'organisme et de son contexte",
                conformite: "Enjeux externes et internes influant sur le système SST identifiés",
                explication: "L'organisme doit déterminer les enjeux externes et internes (conditions de travail, culture, etc.) qui influent sur sa capacité à atteindre les résultats attendus de son système de management de la SST."
            },
            {
                motsCles: ["parties intéressées", "travailleurs", "représentants", "besoins", "attentes", "exigences légales"],
                article: "Art. 4.2",
                titre: "Besoins et attentes des travailleurs et parties intéressées",
                conformite: "Besoins des travailleurs et parties intéressées identifiés et convertis en exigences",
                explication: "L'organisme doit identifier les parties intéressées et accorder une attention particulière aux besoins et attentes des travailleurs (permanents et temporaires) qui deviennent des obligations de conformité."
            },
            {
                motsCles: ["domaine application", "périmètre sst", "limites", "champ d'application"],
                article: "Art. 4.3",
                titre: "Détermination du domaine d'application du système SST",
                conformite: "Limites et applicabilité du système SST définies et documentées",
                explication: "L'organisme doit déterminer les limites physiques et organisationnelles de son système SST en tenant compte de ses activités, produits et services."
            },
            {
                motsCles: ["système management sst", "processus sst", "amélioration sst"],
                article: "Art. 4.4",
                titre: "Système de management de la S&ST",
                conformite: "Système SST établi, mis en œuvre et amélioré en continu",
                explication: "L'organisme doit établir un système incluant les processus nécessaires et leurs interactions pour améliorer la performance SST."
            },
            {
                motsCles: ["leadership", "engagement direction", "responsabilité", "culture sst"],
                article: "Art. 5.1",
                titre: "Leadership et engagement",
                conformite: "Responsabilité de la direction démontrée pour la prévention et la sécurité",
                explication: "La direction doit assumer l'entière responsabilité de la prévention des traumatismes et pathologies liés au travail et promouvoir une culture SST positive."
            },
            {
                motsCles: ["politique sst", "santé sécurité", "engagement"],
                article: "Art. 5.2",
                titre: "Politique de S&ST",
                conformite: "Politique SST établie avec engagements de prévention et consultation",
                explication: "La direction doit définir une politique incluant l'engagement à fournir des conditions de travail sûres, à éliminer les dangers et à consulter les travailleurs."
            },
            {
                motsCles: ["rôles", "responsabilités", "autorités", "fonctions"],
                article: "Art. 5.3",
                titre: "Rôles, responsabilités et autorités",
                conformite: "Responsabilités SST attribuées et communiquées à tous les niveaux",
                explication: "La direction doit s'assurer que les responsabilités pour le système SST sont clairement définies, notamment pour rendre compte de la performance du système."
            },
            {
                motsCles: ["consultation", "participation", "représentants travailleurs", "dialogue", "obstacles"],
                article: "Art. 5.4",
                titre: "Consultation et participation des travailleurs",
                conformite: "Processus de consultation et participation des travailleurs établi",
                explication: "L'organisme doit établir des processus pour consulter les travailleurs non-encadrants sur les politiques, objectifs et changements, et supprimer les obstacles à leur participation."
            },
            {
                motsCles: ["risques", "opportunités", "planification", "incertitude"],
                article: "Art. 6.1.1",
                titre: "Actions face aux risques et opportunités",
                conformite: "Risques et opportunités liés au système SST déterminés",
                explication: "L'organisme doit planifier des actions pour faire face aux risques du système et saisir les opportunités d'amélioration de la performance SST."
            },
            {
                motsCles: ["identification dangers", "sources dangers", "situations dangereuses", "facteurs sociaux"],
                article: "Art. 6.1.2.1",
                titre: "Identification des dangers",
                conformite: "Processus continu d'identification des dangers établi",
                explication: "L'organisme doit identifier les dangers liés à l'organisation du travail, aux facteurs sociaux (charge de travail, harcèlement), aux activités courantes et aux situations d'urgence."
            },
            {
                motsCles: ["évaluation risques", "risques professionnels", "méthodologie"],
                article: "Art. 6.1.2.2",
                titre: "Évaluation des risques pour la S&ST",
                conformite: "Risques SST évalués selon une méthodologie définie",
                explication: "L'organisme doit évaluer les risques pour la SST à partir des dangers identifiés, en tenant compte de l'efficacité des mesures de prévention existantes."
            },
            {
                motsCles: ["exigences légales", "conformité", "veille réglementaire", "lois travail"],
                article: "Art. 6.1.3",
                titre: "Détermination des exigences légales",
                conformite: "Exigences légales et autres exigences SST identifiées et accessibles",
                explication: "L'organisme doit déterminer et avoir accès aux exigences légales à jour applicables à ses dangers et à son système SST."
            },
            {
                motsCles: ["objectifs sst", "cibles", "santé", "sécurité", "prévention"],
                article: "Art. 6.2.1",
                titre: "Objectifs de S&ST",
                conformite: "Objectifs SST cohérents avec la politique et mesurables établis",
                explication: "L'organisme doit établir des objectifs pour maintenir et améliorer le système SST et sa performance à tous les niveaux."
            },
            {
                motsCles: ["compétences", "formation", "aptitude", "qualification"],
                article: "Art. 7.2",
                titre: "Compétences",
                conformite: "Travailleurs compétents sur la base d'une formation ou expérience",
                explication: "L'organisme doit s'assurer que les travailleurs sont capables d'identifier les dangers et de réaliser leurs tâches en toute sécurité."
            },
            {
                motsCles: ["sensibilisation", "culture", "droit de retrait", "conséquences"],
                article: "Art. 7.3",
                titre: "Sensibilisation",
                conformite: "Travailleurs sensibilisés aux risques et à leur droit de retrait",
                explication: "Les travailleurs doivent être informés de la politique SST et de leur capacité à se soustraire à un danger grave et imminent sans représailles."
            },
            {
                motsCles: ["maîtrise opérationnelle", "processus", "contrôle"],
                article: "Art. 8.1.1",
                titre: "Planification et maîtrise opérationnelles",
                conformite: "Mesures de maîtrise des processus SST mises en œuvre",
                explication: "L'organisme doit établir des critères opérationnels pour ses processus et mettre en œuvre des contrôles pour prévenir les blessures."
            },
            {
                motsCles: ["hiérarchie", "élimination", "substitution", "protection collective", "epi"],
                article: "Art. 8.1.2",
                titre: "Élimination des dangers et réduction des risques",
                conformite: "Hiérarchie des mesures de prévention appliquée",
                explication: "L'organisme doit suivre l'ordre : 1. Éliminer, 2. Substituer, 3. Protections collectives, 4. Signalisation/Formation, 5. EPI."
            },
            {
                motsCles: ["achats", "sous-traitants", "intervenants extérieurs", "coordination"],
                article: "Art. 8.1.4",
                titre: "Achats et intervenants extérieurs",
                conformite: "Processus d'achat et de coordination des sous-traitants maîtrisés",
                explication: "L'organisme doit coordonner ses processus d'achat avec ses sous-traitants pour identifier et maîtriser les dangers liés aux interventions extérieures."
            },
            {
                motsCles: ["urgence", "préparation", "réponse", "accidents", "exercices"],
                article: "Art. 8.2",
                titre: "Préparation et réponse aux situations d'urgence",
                conformite: "Processus de réponse aux situations d'urgence établi et testé",
                explication: "L'organisme doit planifier les actions pour répondre aux situations d'urgence (incendie, fuite, etc.) et réaliser des exercices périodiques."
            },
            {
                motsCles: ["évaluation conformité", "audit légal", "vérification"],
                article: "Art. 9.1.2",
                titre: "Évaluation de la conformité",
                conformite: "Conformité aux exigences légales évaluée périodiquement",
                explication: "L'organisme doit évaluer périodiquement s'il respecte les lois et autres exigences et conserver les preuves documentées."
            },
            {
                motsCles: ["audit interne", "programme audit", "vérification"],
                article: "Art. 9.2",
                titre: "Audit interne",
                conformite: "Audits internes réalisés à intervalles planifiés",
                explication: "L'organisme doit mener des audits pour vérifier que le système SST est conforme aux exigences de la norme et aux objectifs de l'entreprise."
            },
            {
                motsCles: ["revue de direction", "revue management", "comité direction", "bilan sst"],
                article: "Art. 9.3",
                titre: "Revue de direction",
                conformite: "Revue de direction réalisée pour évaluer l'efficacité du système SST",
                explication: "La direction doit passer en revue le système de management de la SST à intervalles planifiés pour s'assurer qu'il est toujours approprié, adapté et efficace."
            },
            {
                motsCles: ["non-conformité", "incident", "action corrective", "analyse causes"],
                article: "Art. 10.2",
                titre: "Incidents, non-conformités et actions correctives",
                conformite: "Réaction aux incidents et élimination des causes racines",
                explication: "Suite à un accident ou incident, l'organisme doit réagir, analyser les causes avec la participation des travailleurs et mettre en place des corrections."
            },
            {
                motsCles: ["amélioration continue", "progrès", "performance sst", "kaizen"],
                article: "Art. 10.3",
                titre: "Amélioration continue",
                conformite: "Démarche d'amélioration continue de la performance SST établie",
                explication: "L'organisme doit améliorer en continu la pertinence, l'adéquation et l'efficacité du système de management de la SST."
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
        if (article.includes("5.2") && (normeId === 'iso14001' || texteLower.includes("politique environnementale") || texteLower.includes("politique environnement"))) {
            return "Rédiger une politique environnementale incluant l'engagement de protection de l'environnement et de prévention de la pollution, la faire valider par la direction et la diffuser.";
        }
        if (article.includes("6.1.2") && (normeId === 'iso14001' || texteLower.includes("aspect") || texteLower.includes("impact"))) {
            return "Réaliser une analyse environnementale complète (inventaire des aspects et impacts), définir des critères de significativité et identifier les Aspects Environnementaux Significatifs (AES).";
        }
        if (article.includes("6.1.3") && (normeId === 'iso14001' || texteLower.includes("legal") || texteLower.includes("reglementaire"))) {
            return "Établir un registre des obligations de conformité environnementales (lois, décrets, arrêtés, permis), évaluer leur applicabilité et mettre en place une veille réglementaire.";
        }
        if (article.includes("8.1") && (normeId === 'iso14001' || texteLower.includes("maîtrise opérationnelle") || texteLower.includes("contrôle opérationnel"))) {
            return "Définir des consignes et critères opérationnels pour les activités à impact environnemental (gestion des déchets, rejets, consommations) et former les opérateurs concernés.";
        }
        if (article.includes("8.2") && (normeId === 'iso14001' || texteLower.includes("urgence") || texteLower.includes("accident") || texteLower.includes("déversement"))) {
            return "Établir un plan d'urgence environnemental (ex: kit antipollution, procédures d'évacuation), former le personnel aux premiers gestes et réaliser un exercice de simulation.";
        }
        if (article.includes("9.1.2") && (normeId === 'iso14001' || texteLower.includes("conformité") || texteLower.includes("vérification"))) {
            return "Réaliser un audit de conformité réglementaire environnementale pour vérifier le respect des exigences légales et des permis, et documenter les résultats.";
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

    // Termes indiquant une conformité complète (avec variations de genre/nombre)
    const termesPreuve = [
        "documenté", "documentée", "documentés", "documentées",
        "établi", "établie", "établis", "établies",
        "à jour",
        "validé", "validée", "validés", "validées",
        "signé", "signée", "signés", "signées",
        "affiché", "affichée", "affichés", "affichées",
        "enregistré", "enregistrée", "enregistrés", "enregistrées",
        "formalisé", "formalisée", "formalisés", "formalisées",
        "approuvé", "approuvée", "approuvés", "approuvées",
        "mis en œuvre", "mise en œuvre", "mis en oeuvre", "mise en oeuvre",
        "réalisé", "réalisée", "réalisés", "réalisées",
        "effectué", "effectuée", "effectués", "effectuées",
        "certifié", "certifiée", "certifiés", "certifiées",
        "vérifié", "vérifiée", "vérifiés", "vérifiées",
        "archivé", "archivée", "archivés", "archivées",
        "disponible", "disponibles",
        "communiqué", "communiquée", "communiqués", "communiquées"
    ];

    // Termes indiquant une conformité partielle (avec variations)
    const termesPartiel = [
        "pas encore", "en cours", "prévu", "prévue", "prévus", "prévues",
        "à faire", "manque", "manquent",
        "absent", "absente", "absents", "absentes",
        "non réalisé", "non réalisée", "non réalisés", "non réalisées",
        "insuffisant", "insuffisante", "insuffisants", "insuffisantes",
        "partiel", "partielle", "partiels", "partielles",
        "incomplet", "incomplète", "incomplets", "incomplètes",
        "ébauche", "projet", "envisagé", "envisagée", "parfois"
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
        "n'a pas", "n'a pas été", "n'ont pas été", "ne sont pas", "n'existe pas",
        "pas de", "aucune", "ni", "absence de", "manque de",
        "insuffisant", "incomplet", "ne sont plus"
    ];

    // Fonction auxiliaire : contientTermeDansContexte
    // Vérifie si un terme existe dans une fenêtre autour du mot-clé de la règle
    function contientTermeDansContexte(termes, regleMotsCles, tailleContexte = 150) {
        const motCleIndex = regleMotsCles.reduce((idx, mot) => {
            const i = texteLower.indexOf(mot.toLowerCase());
            return i !== -1 && (idx === -1 || i < idx) ? i : idx;
        }, -1);
        if (motCleIndex === -1) return false;
        const debut = Math.max(0, motCleIndex - tailleContexte);
        const fin = Math.min(texteLower.length, motCleIndex + tailleContexte);
        const fenetre = texteLower.substring(debut, fin);
        return termes.some(terme => fenetre.includes(terme.toLowerCase()));
    }

    // Fonction auxiliaire : extraireContexteRegle
    // Extrait une fenêtre de contexte autour du premier mot-clé de la règle
    function extraireContexteRegle(regleMotsCles, tailleContexte = 200) {
        const motCleIndex = regleMotsCles.reduce((idx, mot) => {
            const i = texteLower.indexOf(mot.toLowerCase());
            return i !== -1 && (idx === -1 || i < idx) ? i : idx;
        }, -1);
        if (motCleIndex === -1) return texteLower;
        return texteLower.substring(
            Math.max(0, motCleIndex - tailleContexte),
            Math.min(texteLower.length, motCleIndex + tailleContexte)
        );
    }

    // Fonction pour détecter si un terme de preuve est précédé d'une négation
    // Version améliorée : vérifie dans le contexte de CHAQUE mot-clé de la règle, pas globalement
    function termeDePreuveAvecNegation(texteLower, termesPreuve, regleMotsCles) {
        // Trouver la position du mot-clé de la règle pour contextualiser
        const motCleIndex = regleMotsCles.reduce((idx, mot) => {
            const i = texteLower.indexOf(mot.toLowerCase());
            return i !== -1 && (idx === -1 || i < idx) ? i : idx;
        }, -1);

        // Si pas de mot-clé trouvé, on ne peut pas contextualiser → retourne false
        if (motCleIndex === -1) return false;

        // Définir une fenêtre autour du mot-clé (100 chars avant et après)
        const fenetreDebut = Math.max(0, motCleIndex - 100);
        const fenetreFin = Math.min(texteLower.length, motCleIndex + 100);
        const fenetreContexte = texteLower.substring(fenetreDebut, fenetreFin);

        // Chercher les termes de preuve DANS cette fenêtre
        for (const terme of termesPreuve) {
            const termeLower = terme.toLowerCase();
            const indexDansFenetre = fenetreContexte.indexOf(termeLower);

            if (indexDansFenetre !== -1) {
                // Terme de preuve trouvé dans la fenêtre du mot-clé
                // Extraire 80 caractères AVANT ce terme (dans la fenêtre)
                const debutContexteAvant = Math.max(0, indexDansFenetre - 80);
                const contexteAvant = fenetreContexte.substring(debutContexteAvant, indexDansFenetre);

                // Vérifier les négations avec word boundary pour les termes courts
                const negationDetectee = NEGATIONS.some(negation => {
                    if (negation.length <= 3) {
                        const regex = new RegExp(`\\b${negation}\\b`, 'i');
                        return regex.test(contexteAvant);
                    }
                    return contexteAvant.includes(negation);
                });

                if (negationDetectee) {
                    return true; // Terme de preuve nié détecté dans le contexte de la règle
                }
            }
        }
        return false; // Aucune négation détectée dans le contexte de la règle
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

    // Fonction pour détecter contradictions DANS LA MÊME PHRASE que le mot-clé
    function detecterContradiction(regleMotsCles) {
        // Découper le texte en phrases (séparées par . ! ?)
        const phrases = texte.split(/[.!?]+/);

        // Trouver la phrase qui contient le mot-clé
        let phraseAvecMotCle = null;
        for (const phrase of phrases) {
            const phraseLower = phrase.toLowerCase();
            const found = regleMotsCles.some(mot =>
                phraseLower.includes(mot.toLowerCase())
            );
            if (found) {
                phraseAvecMotCle = phraseLower;
                break;
            }
        }

        // Si aucune phrase ne contient le mot-clé, pas de contradiction possible
        if (!phraseAvecMotCle) return false;

        // Vérifier contradiction DANS LA MÊME PHRASE uniquement
        const hasPositif = MOTS_POSITIFS.some(mot =>
            phraseAvecMotCle.includes(mot)
        );
        const hasNegatif = MOTS_NEGATIFS.some(mot =>
            phraseAvecMotCle.includes(mot)
        );

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
            // Le mot-clé est trouvé → vérifier les termes de preuve DANS LE CONTEXTE DE LA RÈGLE
            const hasTermesPreuve = contientTermeDansContexte(termesPreuve, regle.motsCles);
            const hasTermesPartiel = contientTermeDansContexte(termesPartiel, regle.motsCles);
            const hasCritique = MOTS_CRITIQUES.some(mot => contientTermeDansContexte([mot], regle.motsCles));
            const hasAbsence = MOTS_ABSENCE.some(mot => contientTermeDansContexte([mot], regle.motsCles));

            // Vérifier si un terme de preuve est précédé d'une négation (dans le contexte de la règle)
            const preuveNiee = termeDePreuveAvecNegation(texteLower, termesPreuve, regle.motsCles);

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
                const gravite = determinerGravite(regle.article, extraireContexteRegle(regle.motsCles));
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

                // Gravité ajustée selon contexte de la règle
                const gravite = determinerGravite(regle.article, extraireContexteRegle(regle.motsCles));

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
    // Logique basée sur le pourcentage de règles détectées (pas sur texteLongueur)
    const pourcentageReglesDetectees = (reglesAvecMotCleDetecte / norme.regles.length) * 100;

    // Indicateur d'analyse partielle (20-50% de règles détectées)
    const analysePartielle = pourcentageReglesDetectees >= 20 && pourcentageReglesDetectees < 50;

    if (pourcentageReglesDetectees < 20) {
        // Moins de 20% de règles détectées → aucune NC d'absence (texte trop partiel)
        recommandationsAbsenceMessage = true;
    } else {
        // 20% ou plus de règles détectées → créer des NC d'absence
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
                    _type: 'absence',
                    _scoreGravite: gravite === 'majeure' ? 2 : 1 // Pour tri
                });
            }
        });

        // Trier par gravité décroissante
        ncAbsence.sort((a, b) => b._scoreGravite - a._scoreGravite);

        // Limiter selon le pourcentage : 20-50% → max 3, >=50% → max 5
        const ncAbsenceLimitees = pourcentageReglesDetectees >= 50 ? ncAbsence : ncAbsence.slice(0, 3);

        // Supprimer les champs temporaires
        ncAbsenceLimitees.forEach(nc => {
            delete nc._scoreGravite;
            delete nc._type;
        });

        // Ajouter à la FIN de la liste des NC (après les NC partielles/contradictions)
        nonConformites = [...nonConformites, ...ncAbsenceLimitees];
    }

    // LIMITER LE NOMBRE TOTAL DE NC
    // Règle : TOUTES les ncCitees sont conservées, puis max 7 NC supplémentaires
    const ncCiteesInternes = nonConformites.filter(nc => nc.estNCCitee);
    const ncContradictions = nonConformites.filter(nc => nc.titre.includes("Contradiction"));
    const ncPreuveNiee = nonConformites.filter(nc => nc.titre.includes("explicitement nié"));
    const ncPartielles = nonConformites.filter(nc => nc.titre.startsWith("Conformité partielle"));
    const ncAbsenceRestantes = nonConformites.filter(nc =>
        !nc.estNCCitee &&
        !nc.titre.includes("Contradiction") &&
        !nc.titre.includes("explicitement nié") &&
        !nc.titre.startsWith("Conformité partielle")
    );

    // Trier les NC non-citées par gravité décroissante
    const ncAutres = [...ncPreuveNiee, ...ncPartielles, ...ncAbsenceRestantes];
    ncAutres.sort((a, b) => {
        const graviteA = a.gravite === 'majeure' ? 2 : 1;
        const graviteB = b.gravite === 'majeure' ? 2 : 1;
        return graviteB - graviteA;
    });

    // Limiter à 7 NC non-citées maximum (contradictions + autres)
    const ncAutresLimitees = ncAutres.slice(0, 7);

    // Reconstruire la liste : NC citées en premier, puis contradictions, puis autres limités
    nonConformites = [...ncCiteesInternes, ...ncContradictions, ...ncAutresLimitees];

    // Calcul du score de confiance
    const scoreConfiance = calculerScoreConfiance(totalMotsClesDetectes, texte);

    // ÉTAPE 3 : Les NC citées sont DÉJÀ en tête (déjà fusionnées ci-dessus)
    // Cette section est conservée pour compatibilité mais ncCitees est déjà inclus
    if (ncCitees.length > 0 && ncCiteesInternes.length === 0) {
        // Cas où ncCitees vient de analyserNonConformitesCitees et n'est pas encore dans nonConformites
        nonConformites = [...ncCitees, ...nonConformites];
    }

    // Calculer le score avec précision (conforme = 1pt, partiel = 0.5pt)
    // Diviser uniquement par le nombre de règles effectivement évaluées (mot-clé trouvé dans le texte)
    const scoreBrut = reglesAvecMotCleDetecte > 0
        ? Math.round((totalPoints / reglesAvecMotCleDetecte) * 100)
        : 0;
    const score = Math.min(scoreBrut, 100); // Plafonner à 100%

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
        nbMineures: nbMineures,
        analysePartielle: analysePartielle || false,
        pourcentageReglesDetectees: pourcentageReglesDetectees
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
    const { score, appreciation, nbMajeures, nbMineures, secteurDetecte, niveauConfiance, analysePartielle } = resultat;

    const secteurLabel = secteurDetecte ? SECTEURS[secteurDetecte]?.label : 'Secteur non détecté';
    const confianceText = `Analyse avec un niveau de confiance ${niveauConfiance.toLowerCase()}`;

    // Badge "Analyse partielle" si texte entre 400 et 800 caractères
    const badgeAnalysePartielle = analysePartielle ? `
    <div style="display: inline-block; background: linear-gradient(135deg, var(--accent), #f39c12); color: white; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-left: 0.75rem;">
        ⚠️ Analyse partielle
    </div>
    ` : '';

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
    <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.2rem;">
        📋 Résumé Exécutif - ${normeNom}${badgeAnalysePartielle}
    </h3>

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
    if (!element) return;
    
    // Retirer la classe active de tous les boutons de sélection
    document.querySelectorAll('#step1 .norm-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Ajouter la classe active au bouton cliqué
    element.classList.add('active');

    // Stocker la norme sélectionnée
    selectedNorm = element.getAttribute('data-norm');
    console.log('Norme sélectionnée:', selectedNorm);

    // Vérifier si on peut activer le bouton de lancement
    checkCanLaunch();
}

// Initialisation ultra-robuste des événements au chargement
function initialiserDiagnostic() {
    console.log('🚀 Initialisation du système de diagnostic...');

    // Délégation d'événements pour les boutons de norme
    // C'est la méthode la plus robuste qui fonctionne même si le DOM change
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.norm-btn');
        if (btn) {
            console.log('🖱️ Clic détecté sur une norme');
            selectNorm(btn);
        }
    });

    // Support clavier pour l'accessibilité
    document.addEventListener('keydown', function(e) {
        const btn = e.target.closest('.norm-btn');
        if (btn && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            selectNorm(btn);
        }
    });

    // Zone de texte (compteur et validation)
    const situationTextarea = document.getElementById('situation');
    if (situationTextarea) {
        situationTextarea.addEventListener('input', updateCharCounter);
        // Déclencher une fois au cas où il y a du texte (auto-fill)
        if (situationTextarea.value.length > 0) updateCharCounter();
    }

    // Bouton de lancement
    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) {
        launchBtn.addEventListener('click', launchDiagnostic);
    }

    // Forcer le style curseur sur tous les boutons de norme existants
    document.querySelectorAll('.norm-btn').forEach(btn => {
        btn.style.cursor = 'pointer';
    });
    
    // Initial server wake up
    wakeUpBackend();
    
    console.log('✅ Système de diagnostic prêt et interactif');
}

// Lancement de l'initialisation selon l'état du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiserDiagnostic);
} else {
    // Si le DOM est déjà prêt (ce qui peut arriver avec defer sur certains navigateurs)
    initialiserDiagnostic();
}

// ============================================
// COMPTEUR DE CARACTÈRES
// ============================================
function updateCharCounter() {
    const textarea = document.getElementById('situation');
    if (!textarea) return;
    
    const counter = document.getElementById('charCounter');
    const length = textarea.value.trim().length;

    if (counter) {
        counter.textContent = `${length} / ${MIN_CHARS} caractères minimum`;

        if (length >= MIN_CHARS) {
            counter.classList.remove('invalid');
            counter.classList.add('valid');
        } else {
            counter.classList.remove('valid');
            counter.classList.add('invalid');
        }
    }

    checkCanLaunch();
}

// ============================================
// VÉRIFICATION BOUTON LANCEMENT
// ============================================
function checkCanLaunch() {
    const textarea = document.getElementById('situation');
    const launchBtn = document.getElementById('launchBtn');
    
    if (!textarea || !launchBtn) return;

    const hasNorm = selectedNorm !== null;
    const hasText = textarea.value.trim().length >= MIN_CHARS;

    if (hasNorm && hasText) {
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

// ============================================
// MODALE D'AVERTISSEMENT TEXTE COURT
// ============================================
let pendingSituation = null;
let pendingNorm = null;
let pendingPourcentage = null;
let pendingResultat = null;

function ouvrirModaleTexteCourt(situation, norme, resultatExistant = null) {
    const texteLongueur = situation.trim().length;

    // Créer la modale si elle n'existe pas
    let modal = document.getElementById('texteCourtModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'texteCourtModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modalTitle');
        modal.innerHTML = `
            <style>
                #texteCourtModal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 10000;
                    justify-content: center;
                    align-items: center;
                }
                #texteCourtModal.active {
                    display: flex;
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }
                .modal-header {
                    background: linear-gradient(135deg, var(--primary), #2c3e50);
                    color: white;
                    padding: 1.25rem;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.2rem;
                }
                .modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }
                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .modal-body {
                    padding: 1.25rem;
                }
                .alert-box {
                    background: linear-gradient(135deg, #fff3cd, #ffe8a1);
                    border-left: 4px solid var(--accent);
                    padding: 1rem;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                }
                .alert-box strong {
                    color: #856404;
                }
                .alert-box p {
                    margin: 0;
                    color: #856404;
                }
                .texte-preview {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    padding: 1rem;
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: inherit;
                    font-size: 0.9rem;
                    line-height: 1.5;
                    color: #495057;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .char-counter {
                    text-align: right;
                    font-size: 0.85rem;
                    color: #6c757d;
                    margin-top: 0.5rem;
                }
                .char-counter.warning {
                    color: var(--accent);
                    font-weight: 600;
                }
                .modal-footer {
                    padding: 1rem 1.25rem;
                    border-top: 1px solid #dee2e6;
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                }
                .btn-modal {
                    padding: 0.625rem 1.25rem;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                }
                .btn-modal-secondary {
                    background: #6c757d;
                    color: white;
                }
                .btn-modal-secondary:hover {
                    background: #5a6268;
                }
                .btn-modal-primary {
                    background: var(--primary);
                    color: white;
                }
                .btn-modal-primary:hover {
                    background: #1a4a6e;
                }
            </style>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">⚠️ Texte insuffisant</h2>
                    <button class="modal-close" onclick="fermerModaleTexteCourt()" aria-label="Fermer">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="alert-box">
                        <strong>Avertissement :</strong><br>
                        Texte insuffisant pour une analyse fiable des absences.
                        Les non-conformités d'absence ne seront pas générées.
                    </div>
                    <div style="margin-bottom: 0.5rem; font-weight: 600; color: var(--primary);">
                        📝 Texte soumis :
                    </div>
                    <div class="texte-preview" id="modalTextePreview"></div>
                    <div class="char-counter warning" id="modalCharCounter"></div>
                    <div id="modalPourcentageInfo" style="margin-top: 0.75rem; padding: 0.75rem; background: #fff3cd; border-radius: 6px; font-size: 0.9rem; color: #856404;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal btn-modal-secondary" onclick="fermerModaleTexteCourt()">Modifier le texte</button>
                    <button class="btn-modal btn-modal-primary" onclick="continuerAnalyse()">Continuer quand même</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Gestion de la fermeture par Echap
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                fermerModaleTexteCourt();
            }
        });

        // Focus trap
        modal.addEventListener('keydown', function(e) {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });
    }

    // Mettre à jour le contenu
    document.getElementById('modalTextePreview').textContent = situation;

    // Utiliser le résultat existant (backend) ou recalculer localement
    const normMap = {'ISO 9001':'iso9001','ISO 14001':'iso14001','ISO 45001':'iso45001'};
    const resultToUse = resultatExistant || analyserTexteLocal(situation, normMap[norme]);
    
    const reglesDetectees = resultToUse.conformites.length + resultToUse.nonConformites.filter(nc => !nc.probleme?.includes('Absence totale')).length;
    const pourcentage = (reglesDetectees / NORMES[normMap[norme]].regles.length) * 100;

    document.getElementById('modalCharCounter').textContent = `${texteLongueur} caractère(s) - ${Math.round(pourcentage)}% de règles détectées`;
    document.getElementById('modalPourcentageInfo').innerHTML = `<strong>${Math.round(pourcentage)}% des exigences de la norme sont couvertes.</strong><br>Seuil minimum requis : 20%. Ajoutez plus de détails sur votre système de management pour obtenir une analyse complète.`;

    // Stocker le résultat pour éviter un recalcul lors de "Continuer quand même"
    pendingResultat = resultToUse;

    // Afficher la modale
    modal.classList.add('active');

    // Focus sur le premier bouton pour l'accessibilité
    setTimeout(() => {
        const firstBtn = modal.querySelector('.btn-modal-secondary');
        if (firstBtn) firstBtn.focus();
    }, 100);
}

function fermerModaleTexteCourt() {
    const modal = document.getElementById('texteCourtModal');
    if (modal) {
        modal.classList.remove('active');
        pendingSituation = null;
        pendingNorm = null;
        pendingPourcentage = null;
    }
}

function continuerAnalyse() {
    const modal = document.getElementById('texteCourtModal');
    if (modal) {
        modal.classList.remove('active');
    }

    // Les résultats ont déjà été calculés dans ouvrirModaleTexteCourt()
    // On utilise le résultat en cache pour éviter un recalcul
    if (pendingResultat) {
        displayResults(pendingResultat);
        pendingResultat = null;
    }
    pendingSituation = null;
    pendingNorm = null;
    pendingPourcentage = null;
}

// Fonction pour lancer l'analyse locale (fallback ou après confirmation modale)
function lancerAnalyseLocale(situation, norme, pourcentageReglesDetectees) {
    const normMap = {'ISO 9001':'iso9001','ISO 14001':'iso14001','ISO 45001':'iso45001'};
    try {
        const localResult = analyserTexteLocal(situation, normMap[norme]);
        // Vérifier si le pourcentage de règles détectées est < 20% → afficher modale
        if (pourcentageReglesDetectees === undefined) {
            // Si non fourni, on recalculle rapidement
            const reglesDetectees = localResult.conformites.length + localResult.nonConformites.filter(nc => !nc.probleme?.includes('Absence totale')).length;
            pourcentageReglesDetectees = (reglesDetectees / NORMES[normMap[norme]].regles.length) * 100;
        }
        if (pourcentageReglesDetectees < 20) {
            pendingSituation = situation;
            pendingNorm = norme;
            pendingPourcentage = pourcentageReglesDetectees;
            ouvrirModaleTexteCourt(situation, norme);
            return;
        }
        displayResults(localResult);
    } catch (error) {
        console.error('Erreur analyse locale:', error);
        const errorDisplay = document.getElementById('rateLimitMsg');
        if (errorDisplay) {
            errorDisplay.textContent = '❌ L\'analyse a échoué. Veuillez réessayer.';
            errorDisplay.style.display = 'block';
        }
    }
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
    const loader = document.getElementById('loader');
    loader.classList.add('active');

    // Animation artistique du texte du loader (Neural Scan)
    const loaderText = loader.querySelector('.loader-text');
    const scanMessages = [
        "Initialisation de la matrice ISO...",
        "Analyse des structures sémantiques...",
        "Extraction des vecteurs de conformité...",
        "Interrogation des modèles neuronaux...",
        "Génération du rapport stratégique..."
    ];
    
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        if (loader.classList.contains('active')) {
            loaderText.innerHTML = `${scanMessages[msgIndex]}<span class="loader-dots"></span>`;
            msgIndex = (msgIndex + 1) % scanMessages.length;
        } else {
            clearInterval(msgInterval);
        }
    }, 1500);

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

        console.log('📊 Données Fusion QSE reçues:', data);
        console.log('📋 Norme sélectionnée:', selectedNorm);

        // Mapper les données du backend Fusion QSE vers le format attendu par le frontend
        const selectedNormKey = selectedNorm.replace(/\s+/g, '').toLowerCase(); // iso9001, iso14001, iso45001
        const normIdMap = {
            'iso9001': 'iso9001',
            'iso14001': 'iso14001',
            'iso45001': 'iso45001'
        };
        const currentNormFindings = data.details[normIdMap[selectedNormKey]] || [];

        // Débogage des clés disponibles
        console.log('🔑 Clés disponibles dans data:', Object.keys(data));
        console.log('📋 selectedNormKey:', selectedNormKey);

        // Mapping correct des scores
        const scoreMap = {
            'iso9001': data.iso_9001_score,
            'iso14001': data.iso_14001_score,
            'iso45001': data.iso_45001_score
        };

        const selectedScore = scoreMap[selectedNormKey] || data.global_qse_score || 0;

        console.log('📊 Score pour la norme:', selectedScore);

        const result = {
            // Données Fusion QSE Globales
            isFusion: true,
            fusionData: {
                iso9001: data.iso_9001_score || 0,
                iso14001: data.iso_14001_score || 0,
                iso45001: data.iso_45001_score || 0,
                global: data.global_qse_score || 0,
                risk: data.risk_level || 'medium'
            },
            // Données pour la norme sélectionnée
            score: selectedScore,
            appreciation: getAppreciation(selectedScore),
            nonConformites: currentNormFindings
                .filter(f => f.status.includes('NON_CONFORM'))
                .map(f => ({
                    titre: `Non-conformité ${f.status === 'NON_CONFORM_CRITICAL' ? 'majeure' : 'mineure'}`,
                    article: f.ruleId.split('-')[1] || f.ruleId,
                    gravite: f.status === 'NON_CONFORM_CRITICAL' ? 'majeure' : 'mineure',
                    probleme: f.evidence,
                    explication: f.explanation,
                    action_corrective: f.action
                })),
            conformites: currentNormFindings
                .filter(f => f.status === 'COMPLIANT' || f.status === 'OBSERVATION')
                .map(f => ({
                    description: f.evidence || f.explanation,
                    article: f.ruleId.split('-')[1] || f.ruleId,
                    statut: f.status === 'COMPLIANT' ? 'conforme' : 'partiel'
                })),
            recommandations: currentNormFindings
                .filter(f => f.status.includes('NON_CONFORM') || f.status === 'OBSERVATION')
                .map(f => ({
                    action: f.action,
                    priorite: f.status === 'NON_CONFORM_CRITICAL' ? 'urgent' : (f.status === 'NON_CONFORM_MINOR' ? 'moyen_terme' : 'long_terme'),
                    benefice: f.explanation
                }))
        };

        // Masquer le message de connexion après succès
        if (serverStatusMsg) {
            serverStatusMsg.style.display = 'none';
        }

        // Calculer le pourcentage de règles détectées pour vérifier si modale nécessaire
        const normMap = {'ISO 9001':'iso9001','ISO 14001':'iso14001','ISO 45001':'iso45001'};
        const reglesDetectees = result.conformites.length + result.nonConformites.filter(nc => !nc.probleme?.includes('Absence totale')).length;
        const totalRegles = NORMES[normMap[selectedNorm]].regles.length;
        const pourcentageReglesDetectees = (reglesDetectees / totalRegles) * 100;

        console.log(`📊 Règles détectées: ${reglesDetectees}/${totalRegles} (${Math.round(pourcentageReglesDetectees)}%)`);
        console.log('📋 Conformités:', result.conformites.length);
        console.log('🔴 Non-conformités:', result.nonConformites.length);

        // Afficher toujours les résultats, même avec peu de données
        // La modale n'est plus nécessaire car elle bloque l'expérience utilisateur
        console.log('✅ Affichage des résultats...');
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
            // Masquer le loader en cas d'erreur
            document.getElementById('loader').classList.remove('active');

            const normMap = {'ISO 9001':'iso9001','ISO 14001':'iso14001','ISO 45001':'iso45001'};
            const localResult = analyserTexteLocal(situation, normMap[selectedNorm]);
            // Vérifier le pourcentage de règles détectées
            const reglesDetectees = localResult.conformites.length + localResult.nonConformites.filter(nc => !nc.probleme?.includes('Absence totale')).length;
            const pourcentageReglesDetectees = (reglesDetectees / NORMES[normMap[selectedNorm]].regles.length) * 100;
            if (pourcentageReglesDetectees < 20) {
                pendingSituation = situation;
                pendingNorm = selectedNorm;
                pendingPourcentage = pourcentageReglesDetectees;
                ouvrirModaleTexteCourt(situation, selectedNorm);
            } else {
                displayResults(localResult);
            }
        } catch (localError) {
            // Si l'analyse locale échoue aussi, afficher l'erreur sans alert()
            console.error('Erreur API et analyse locale:', error, localError);

            // Masquer le loader
            document.getElementById('loader').classList.remove('active');

            // Réafficher les étapes
            document.getElementById('step1').style.display = 'block';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('launchBtn').style.display = 'block';

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

    // Mise à jour du Dashboard Fusion QSE si présent
    if (result.isFusion && result.fusionData) {
        updateQSEDashboard(result.fusionData);
    }

    // Supprimer d'éventuels éléments existants (pour éviter doublons si relance)
    const existingSituation = document.getElementById('situationAnalysee');
    const existingResume = document.getElementById('resumeExecutifContainer');
    if (existingSituation) existingSituation.remove();
    if (existingResume) existingResume.remove();

    // Créer un conteneur pour la situation analysée et le résumé exécutif
    const topContainer = document.createElement('div');
    topContainer.id = 'resumeExecutifContainer';
    topContainer.style.cssText = 'margin-bottom: 2rem;';

    // HTML pour "Situation analysée" + Résumé exécutif
    topContainer.innerHTML = `
    <div id="situationAnalysee" style="background: white; border-left: 4px solid var(--primary); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(30, 95, 140, 0.1);">
        <div style="font-weight: 600; color: var(--primary); margin-bottom: 0.75rem; font-size: 1.05rem;">
            📝 Situation analysée
        </div>
        <div style="font-style: italic; color: #555; background: #f8f9fa; padding: 1rem; border-radius: 6px; line-height: 1.6; font-size: 0.95rem;">
            "${situation}"
        </div>
    </div>
    ${genererResumeExecutif(result, normeNom)}
    `;

    // Insérer en tout premier dans resultsContainer (après le dashboard s'il existe)
    const qseDashboard = document.getElementById('qseDashboard');
    if (qseDashboard) {
        qseDashboard.after(topContainer);
    } else if (resultsContainer.firstChild) {
        resultsContainer.insertBefore(topContainer, resultsContainer.firstChild);
    } else {
        resultsContainer.appendChild(topContainer);
    }

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

function updateQSEDashboard(fusionData) {
    const qseDashboard = document.getElementById('qseDashboard');
    if (!qseDashboard) return;

    qseDashboard.style.display = 'block';

    const s9001 = document.getElementById('score9001');
    const s14001 = document.getElementById('score14001');
    const s45001 = document.getElementById('score45001');
    const riskLevel = document.getElementById('globalRiskLevel');

    if (s9001) s9001.textContent = `${fusionData.iso9001}%`;
    if (s14001) s14001.textContent = `${fusionData.iso14001}%`;
    if (s45001) s45001.textContent = `${fusionData.iso45001}%`;

    if (riskLevel) {
        const levels = {
            'low': { text: 'RISQUE FAIBLE', color: '#27ae60' },
            'medium': { text: 'RISQUE MODÉRÉ', color: '#f39c12' },
            'high': { text: 'RISQUE ÉLEVÉ', color: '#e67e22' },
            'critical': { text: 'RISQUE CRITIQUE', color: '#e74c3c' }
        };
        const level = levels[fusionData.risk] || levels['medium'];
        riskLevel.textContent = level.text;
        riskLevel.style.color = level.color;
    }
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
        // Échapper les données provenant du backend pour prévenir les XSS
        const safeProbleme = escapeHTML(nc.probleme);
        const safeExplication = escapeHTML(nc.explication);
        const safeActionCorrective = escapeHTML(nc.action_corrective);
        const safeTitre = escapeHTML(nc.titre);
        const safeArticle = escapeHTML(nc.article);

        // Style spécial pour les NC citées par l'utilisateur
        if (nc.estNCCitee) {
            return `
            <div class="result-item" style="border-left: 4px solid #e74c3c; background: linear-gradient(135deg, #fff5f5, #ffe8e8); box-shadow: 0 4px 15px rgba(231, 76, 60, 0.15);">
                <div class="result-item-header">
                    <span class="result-item-title" style="color: #c0392b; font-weight: 600;">🔴 NC citée par l'auditeur</span>
                    <span class="gravite-badge ${nc.gravite}" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">${nc.gravite.toUpperCase()}</span>
                </div>
                <div style="font-style: italic; color: #7f8c8d; font-size: 1rem; margin: 0.75rem 0; padding: 0.75rem; background: white; border-radius: 8px; border-left: 3px solid #e74c3c;">
                    "${safeProbleme}"
                </div>
                <div class="article-reference" style="font-weight: 600; color: #2c3e50;">📋 Référence normative : ${safeArticle}</div>
                <div class="result-explication" style="margin-top: 0.75rem;">
                    <strong style="color: #2c3e50;">📖 Exigence de la norme :</strong><br>
                    <span style="color: #555; line-height: 1.6;">${safeExplication}</span>
                </div>
                <div class="action-corrective" style="margin-top: 1rem; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-left: 3px solid #28a745;">
                    <div class="action-corrective-label" style="color: #155724; font-weight: 600;">✓ Solution recommandée</div>
                    <span style="color: #1e7e34;">${safeActionCorrective}</span>
                </div>
            </div>
            `;
        }

        // Affichage standard pour les autres NC
        return `
        <div class="result-item ${nc.gravite}">
            <div class="result-item-header">
                <span class="result-item-title">${safeTitre}</span>
                <span class="gravite-badge ${nc.gravite}">${nc.gravite.toUpperCase()}</span>
            </div>
            <div class="article-reference">${safeArticle}</div>
            <div class="result-description">${safeProbleme}</div>
            <div class="result-explication">
                <strong>Pourquoi c'est une non-conformité :</strong><br>
                ${safeExplication}
            </div>
            <div class="action-corrective">
                <div class="action-corrective-label">✓ Action corrective recommandée</div>
                ${safeActionCorrective}
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
 
