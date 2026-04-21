/**
 * BASE DE DONNÉES DES RÈGLES ISO STRUCTURÉE
 * Indexation par ID unique pour le matching vectoriel et par mots-clés
 */

const RULES_DB = {
    // --- ISO 9001:2015 (QUALITÉ) ---
    "ISO9001-4.1": {
        norm: "9001", clause: "4.1", weight: 3, criticality: "high",
        title: "Compréhension de l'organisme et de son contexte",
        keywords: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "environnement externe", "facteurs internes", "contexte organisation", "enjeux stratégiques"]
    },
    "ISO9001-4.2": {
        norm: "9001", clause: "4.2", weight: 3, criticality: "high",
        title: "Compréhension des besoins des parties intéressées",
        keywords: ["parties intéressées", "parties prenantes", "besoins parties", "attentes parties", "exigences parties", "clients exigences", "actionnaires", "fournisseurs parties"]
    },
    "ISO9001-4.3": {
        norm: "9001", clause: "4.3", weight: 3, criticality: "high",
        title: "Détermination du domaine d'application du SMQ",
        keywords: ["domaine application", "périmètre smq", "champ application", "limites smq", "applicabilité", "domaine smq", "périmètre qualité"]
    },
    "ISO9001-4.4": {
        norm: "9001", clause: "4.4", weight: 3, criticality: "high",
        title: "Système de management de la qualité et ses processus",
        keywords: ["processus smq", "cartographie processus", "interaction processus", "approche processus", "séquence processus", "système management qualité", "mise en oeuvre smq", "processus nécessaires"]
    },
    "ISO9001-5.1": {
        norm: "9001", clause: "5.1", weight: 3, criticality: "high",
        title: "Leadership et engagement de la direction",
        keywords: ["leadership", "engagement direction", "responsabilité direction", "engagement management", "implication direction", "direction smq", "top management", "haute direction"]
    },
    "ISO9001-5.1.2": {
        norm: "9001", clause: "5.1.2", weight: 3, criticality: "high",
        title: "Orientation client",
        keywords: ["orientation client", "satisfaction client", "exigences client", "focus client", "centré client", "besoins clients", "attentes clients", "écoute client"]
    },
    "ISO9001-5.2": {
        norm: "9001", clause: "5.2", weight: 3, criticality: "high",
        title: "Politique qualité",
        keywords: ["politique qualité", "politique smq", "engagement qualité", "orientation qualité", "politique documentée", "politique communiquée", "axes qualité"]
    },
    "ISO9001-5.3": {
        norm: "9001", clause: "5.3", weight: 3, criticality: "high",
        title: "Rôles, responsabilités et autorités",
        keywords: ["rôles responsabilités", "autorités smq", "responsabilités définies", "organigramme", "attribution responsabilités", "fonctions responsabilités", "responsable qualité", "représentant direction"]
    },
    "ISO9001-6.1": {
        norm: "9001", clause: "6.1", weight: 3, criticality: "high",
        title: "Actions face aux risques et opportunités",
        keywords: ["risques opportunités", "analyse risques", "gestion risques", "identification risques", "traitement risques", "risques smq", "opportunités amélioration", "approche risques", "actions préventives"]
    },
    "ISO9001-6.2": {
        norm: "9001", clause: "6.2", weight: 3, criticality: "high",
        title: "Objectifs qualité et planification",
        keywords: ["objectifs qualité", "objectifs smq", "objectifs mesurables", "objectifs smart", "indicateurs qualité", "cibles qualité", "planification objectifs", "objectifs surveillés"]
    },
    "ISO9001-6.3": {
        norm: "9001", clause: "6.3", weight: 3, criticality: "high",
        title: "Planification des modifications",
        keywords: ["planification modifications", "gestion changements", "maîtrise modifications", "changements planifiés", "modifications smq", "gestion modifications"]
    },
    "ISO9001-7.1": {
        norm: "9001", clause: "7.1", weight: 3, criticality: "high",
        title: "Ressources",
        keywords: ["ressources smq", "ressources humaines", "infrastructure", "équipements", "ressources nécessaires", "moyens", "ressources disponibles", "environnement travail", "ressources processus"]
    },
    "ISO9001-7.1.5": {
        norm: "9001", clause: "7.1.5", weight: 3, criticality: "high",
        title: "Ressources pour la surveillance et la mesure",
        keywords: ["étalonnage", "métrologie", "équipements mesure", "traçabilité mesure", "vérification équipements", "instruments mesure", "surveillance mesure ressources", "étalons mesure"]
    },
    "ISO9001-7.1.6": {
        norm: "9001", clause: "7.1.6", weight: 3, criticality: "high",
        title: "Connaissances organisationnelles",
        keywords: ["connaissances organisationnelles", "knowledge management", "capitalisation connaissances", "gestion connaissances", "savoir faire", "retour expérience", "expertise interne"]
    },
    "ISO9001-7.2": {
        norm: "9001", clause: "7.2", weight: 3, criticality: "high",
        title: "Compétences",
        keywords: ["compétences", "formation personnel", "qualification personnel", "habilitation", "plan formation", "évaluation compétences", "développement compétences", "formation smq"]
    },
    "ISO9001-7.3": {
        norm: "9001", clause: "7.3", weight: 3, criticality: "high",
        title: "Sensibilisation",
        keywords: ["sensibilisation", "sensibilisation qualité", "conscience qualité", "personnel sensibilisé", "culture qualité", "implication personnel", "sensibilisation politique"]
    },
    "ISO9001-7.4": {
        norm: "9001", clause: "7.4", weight: 3, criticality: "high",
        title: "Communication",
        keywords: ["communication interne", "communication externe", "plan communication", "communication smq", "réunions qualité", "communication processus", "information personnel"]
    },
    "ISO9001-7.5": {
        norm: "9001", clause: "7.5", weight: 3, criticality: "high",
        title: "Informations documentées",
        keywords: ["informations documentées", "documentation smq", "procédures documentées", "enregistrements qualité", "documents qualité", "maîtrise documents", "gestion documentaire", "contrôle documents"]
    },
    "ISO9001-8.1": {
        norm: "9001", clause: "8.1", weight: 2, criticality: "medium",
        title: "Planification et maîtrise opérationnelles",
        keywords: ["planification opérationnelle", "maîtrise opérationnelle", "planification production", "critères processus", "maîtrise production", "planification réalisation", "processes opérationnels"]
    },
    "ISO9001-8.2": {
        norm: "9001", clause: "8.2", weight: 2, criticality: "medium",
        title: "Exigences relatives aux produits et services",
        keywords: ["exigences client", "communication client", "réclamation client", "retour client", "plainte client", "insatisfaction client", "commande client", "contrat client", "exigences produits services"]
    },
    "ISO9001-8.3": {
        norm: "9001", clause: "8.3", weight: 2, criticality: "medium",
        title: "Conception et développement",
        keywords: ["conception développement", "design", "développement produit", "conception produit", "processus conception", "validation conception", "vérification conception", "revue conception"]
    },
    "ISO9001-8.4": {
        norm: "9001", clause: "8.4", weight: 2, criticality: "medium",
        title: "Maîtrise des prestataires externes",
        keywords: ["prestataires externes", "fournisseurs", "sous-traitants", "évaluation fournisseurs", "maîtrise fournisseurs", "achats", "sélection fournisseurs", "surveillance fournisseurs", "externalisation"]
    },
    "ISO9001-8.5": {
        norm: "9001", clause: "8.5", weight: 2, criticality: "medium",
        title: "Production et prestation de service",
        keywords: ["production", "prestation service", "maîtrise production", "conditions maîtrisées", "traçabilité", "identification produit", "livraison", "préservation produit", "activités après livraison"]
    },
    "ISO9001-8.6": {
        norm: "9001", clause: "8.6", weight: 2, criticality: "medium",
        title: "Libération des produits et services",
        keywords: ["libération produit", "contrôle final", "acceptation produit", "vérification conformité", "validation produit", "contrôle qualité", "autorisation livraison", "libération service"]
    },
    "ISO9001-8.7": {
        norm: "9001", clause: "8.7", weight: 2, criticality: "medium",
        title: "Maîtrise des éléments de sortie non conformes",
        keywords: ["non-conformité produit", "produit non conforme", "élément non conforme", "traitement non-conformité", "rebut", "dérogation", "correction produit", "isolement produit non conforme"]
    },
    "ISO9001-9.1": {
        norm: "9001", clause: "9.1", weight: 1, criticality: "low",
        title: "Surveillance, mesure, analyse et évaluation",
        keywords: ["surveillance performance", "mesure performance", "indicateurs performance", "kpi qualité", "évaluation performance", "satisfaction client mesure", "analyse données", "évaluation smq"]
    },
    "ISO9001-9.1.3": {
        norm: "9001", clause: "9.1.3", weight: 1, criticality: "low",
        title: "Analyse et évaluation",
        keywords: ["analyse évaluation données", "analyse résultats", "évaluation données qualité", "exploitation données", "analyse statistique", "tendances qualité", "analyse performances"]
    },
    "ISO9001-9.2": {
        norm: "9001", clause: "9.2", weight: 1, criticality: "low",
        title: "Audit interne",
        keywords: ["audit interne", "programme audit", "auditeurs internes", "audit smq", "programme audit interne", "planification audit", "résultats audit", "rapport audit interne"]
    },
    "ISO9001-9.3": {
        norm: "9001", clause: "9.3", weight: 1, criticality: "low",
        title: "Revue de direction",
        keywords: ["revue de direction", "revue management", "comité direction", "bilan direction", "revue smq", "réunion direction qualité", "management review", "revue annuelle"]
    },
    "ISO9001-10.2": {
        norm: "9001", clause: "10.2", weight: 1, criticality: "low",
        title: "Non-conformité et action corrective",
        keywords: ["action corrective", "traitement non-conformité", "analyse causes", "causes racines", "correction non-conformité", "réclamation traitement", "élimination causes", "actions correctives smq"]
    },
    "ISO9001-10.3": {
        norm: "9001", clause: "10.3", weight: 1, criticality: "low",
        title: "Amélioration continue",
        keywords: ["amélioration continue", "amélioration smq", "kaizen", "démarche amélioration", "progrès continu", "amélioration performances", "plan amélioration", "amélioration pertinence"]
    },

    // --- ISO 14001:2015 (ENVIRONNEMENT) ---
    "ISO14001-4.1": {
        norm: "14001", clause: "4.1", weight: 3, criticality: "high",
        title: "Compréhension de l'organisme et de son contexte",
        keywords: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "conditions environnementales", "facteurs internes", "contexte organisation", "enjeux stratégiques"]
    },
    "ISO14001-4.2": {
        norm: "14001", clause: "4.2", weight: 3, criticality: "high",
        title: "Compréhension des besoins et attentes des parties intéressées",
        keywords: ["parties intéressées", "parties prenantes", "besoins parties", "attentes parties", "obligations conformité", "exigences légales environnement", "exigences parties"]
    },
    "ISO14001-4.3": {
        norm: "14001", clause: "4.3", weight: 3, criticality: "high",
        title: "Détermination du domaine d'application du SME",
        keywords: ["domaine application", "périmètre sme", "champ application", "limites sme", "applicabilité sme", "domaine environnemental", "limites physiques", "unités organisationnelles"]
    },
    "ISO14001-4.4": {
        norm: "14001", clause: "4.4", weight: 3, criticality: "high",
        title: "Système de management environnemental",
        keywords: ["processus sme", "système management environnemental", "mise en oeuvre sme", "processus nécessaires", "interactions processus", "amélioration performance environnementale", "établir sme"]
    },
    "ISO14001-5.1": {
        norm: "14001", clause: "5.1", weight: 3, criticality: "high",
        title: "Leadership et engagement",
        keywords: ["leadership", "engagement direction", "responsabilité direction", "engagement management", "implication direction", "direction sme", "haute direction", "top management environnement"]
    },
    "ISO14001-5.2": {
        norm: "14001", clause: "5.2", weight: 3, criticality: "high",
        title: "Politique environnementale",
        keywords: ["politique environnementale", "politique sme", "engagement environnemental", "prévention pollution", "protection environnement", "politique documentée", "engagements conformité", "politique communiquée"]
    },
    "ISO14001-5.3": {
        norm: "14001", clause: "5.3", weight: 3, criticality: "high",
        title: "Rôles, responsabilités et autorités",
        keywords: ["rôles responsabilités", "autorités sme", "responsabilités définies", "attribution responsabilités", "fonctions responsabilités", "représentant direction", "responsable environnement"]
    },
    "ISO14001-6.1.1": {
        norm: "14001", clause: "6.1.1", weight: 3, criticality: "high",
        title: "Actions face aux risques et opportunités",
        keywords: ["risques opportunités", "analyse risques environnement", "gestion risques sme", "identification risques", "situations urgence", "risques sme", "opportunités environnement", "planification risques"]
    },
    "ISO14001-6.1.2a": {
        norm: "14001", clause: "6.1.2.a", weight: 3, criticality: "high",
        title: "Identification des aspects environnementaux",
        keywords: ["aspects environnementaux", "impacts environnementaux", "identification aspects", "inventaire aspects", "activités produits services", "émissions air", "rejets eau", "déchets", "consommation ressources", "nuisance sonore", "pollution sol", "aspects directs", "aspects indirects"]
    },
    "ISO14001-6.1.2b": {
        norm: "14001", clause: "6.1.2.b", weight: 3, criticality: "high",
        title: "Détermination des aspects environnementaux significatifs",
        keywords: ["aspects significatifs", "évaluation aspects", "critères significativité", "priorisation impacts", "analyse environnementale évaluation", "méthodologie évaluation", "critères évaluation", "aes", "impacts majeurs"]
    },
    "ISO14001-6.1.3": {
        norm: "14001", clause: "6.1.3", weight: 3, criticality: "high",
        title: "Obligations de conformité",
        keywords: ["obligations conformité", "exigences légales", "réglementation environnementale", "permis environnementaux", "licences environnement", "lois environnement", "exigences réglementaires", "conformité légale environnement", "veille réglementaire"]
    },
    "ISO14001-6.1.4": {
        norm: "14001", clause: "6.1.4", weight: 3, criticality: "high",
        title: "Planification d'actions",
        keywords: ["planification actions", "actions aspects significatifs", "actions obligations conformité", "plan actions environnement", "intégration actions processus", "efficacité actions", "maîtrise risques"]
    },
    "ISO14001-6.2.1": {
        norm: "14001", clause: "6.2.1", weight: 3, criticality: "high",
        title: "Objectifs environnementaux",
        keywords: ["objectifs environnementaux", "objectifs sme", "objectifs mesurables environnement", "cibles environnementales", "objectifs aspects significatifs", "objectifs conformité", "planification objectifs environnement", "politique environnementale cohérence"]
    },
    "ISO14001-6.2.2": {
        norm: "14001", clause: "6.2.2", weight: 3, criticality: "high",
        title: "Planification des actions pour atteindre les objectifs",
        keywords: ["planification atteinte objectifs", "plan actions objectifs environnement", "ressources objectifs", "responsables objectifs", "échéances objectifs", "indicateurs objectifs environnementaux", "évaluation résultats objectifs", "étapes réalisation"]
    },
    "ISO14001-7.1": {
        norm: "14001", clause: "7.1", weight: 3, criticality: "high",
        title: "Ressources",
        keywords: ["ressources sme", "ressources humaines environnement", "infrastructure environnement", "ressources nécessaires sme", "moyens sme", "ressources management environnemental", "budget environnement"]
    },
    "ISO14001-7.2": {
        norm: "14001", clause: "7.2", weight: 3, criticality: "high",
        title: "Compétences",
        keywords: ["compétences environnement", "formation personnel sme", "qualification personnel environnement", "plan formation sme", "évaluation compétences environnement", "compétences aspects environnementaux", "besoins formation environnement"]
    },
    "ISO14001-7.3": {
        norm: "14001", clause: "7.3", weight: 3, criticality: "high",
        title: "Sensibilisation",
        keywords: ["sensibilisation environnement", "sensibilisation sme", "conscience environnementale", "personnel sensibilisé environnement", "culture environnementale", "sensibilisation politique environnementale", "sensibilisation aspects significatifs", "conséquences non-respect"]
    },
    "ISO14001-7.4": {
        norm: "14001", clause: "7.4", weight: 3, criticality: "high",
        title: "Communication",
        keywords: ["communication interne environnement", "communication externe environnement", "plan communication sme", "communication sme", "communication parties intéressées", "informations environnementales", "répondre communication externe"]
    },
    "ISO14001-7.5": {
        norm: "14001", clause: "7.5", weight: 3, criticality: "high",
        title: "Informations documentées",
        keywords: ["informations documentées sme", "documentation sme", "procédures documentées environnement", "enregistrements environnement", "documents sme", "maîtrise documents environnement", "gestion documentaire sme", "archivage environnement"]
    },
    "ISO14001-8.1a": {
        norm: "14001", clause: "8.1.a", weight: 2, criticality: "medium",
        title: "Maîtrise opérationnelle des processus",
        keywords: ["planification opérationnelle environnement", "maîtrise opérationnelle sme", "critères opérationnels", "maîtrise processus environnement", "contrôles opérationnels", "maîtrise activités impactantes", "maintien conditions"]
    },
    "ISO14001-8.1b": {
        norm: "14001", clause: "8.1.b", weight: 2, criticality: "medium",
        title: "Perspective de cycle de vie en conception",
        keywords: ["perspective cycle de vie", "conception environnementale", "développement durable conception", "écoconception", "impact cycle de vie", "étapes cycle de vie", "conception produits services environnement"]
    },
    "ISO14001-8.1c": {
        norm: "14001", clause: "8.1.c", weight: 2, criticality: "medium",
        title: "Maîtrise des achats et prestataires externes",
        keywords: ["achats environnementaux", "exigences fournisseurs environnement", "maîtrise sous-traitants environnement", "critères achat durable", "communication fournisseurs environnement", "prestataires externes environnement"]
    },
    "ISO14001-8.1d": {
        norm: "14001", clause: "8.1.d", weight: 2, criticality: "medium",
        title: "Information sur l'utilisation et la fin de vie",
        keywords: ["utilisation fin de vie", "élimination déchets finale", "information impacts utilisation", "transport livraison impacts", "fin de vie produits environnement", "traitement déchets utilisation"]
    },
    "ISO14001-8.2": {
        norm: "14001", clause: "8.2", weight: 2, criticality: "medium",
        title: "Préparation et réponse aux situations d'urgence",
        keywords: ["situations urgence", "préparation urgence", "réponse urgence", "plan urgence environnement", "accidents environnementaux", "déversements", "incidents environnementaux", "exercices urgence", "tests réponse urgence"]
    },
    "ISO14001-9.1.1": {
        norm: "14001", clause: "9.1.1", weight: 1, criticality: "low",
        title: "Surveillance, mesure, analyse et évaluation",
        keywords: ["surveillance performance environnementale", "mesure performance sme", "indicateurs performance environnement", "kpi environnement", "évaluation performance sme", "analyse données environnement", "équipements surveillance étalonnés"]
    },
    "ISO14001-9.1.2": {
        norm: "14001", clause: "9.1.2", weight: 1, criticality: "low",
        title: "Évaluation de la conformité",
        keywords: ["évaluation conformité", "conformité obligations", "vérification conformité légale", "audit conformité", "état conformité", "évaluation exigences légales environnement"]
    },
    "ISO14001-9.2": {
        norm: "14001", clause: "9.2", weight: 1, criticality: "low",
        title: "Audit interne",
        keywords: ["audit interne environnement", "programme audit sme", "auditeurs internes sme", "audit sme", "planification audit environnement", "résultats audit environnement", "rapport audit interne sme"]
    },
    "ISO14001-9.3": {
        norm: "14001", clause: "9.3", weight: 1, criticality: "low",
        title: "Revue de direction",
        keywords: ["revue direction environnement", "revue management sme", "bilan direction sme", "revue sme", "réunion direction environnement", "management review environnement", "revue annuelle sme"]
    },
    "ISO14001-10.2": {
        norm: "14001", clause: "10.2", weight: 1, criticality: "low",
        title: "Non-conformité et actions correctives",
        keywords: ["action corrective environnement", "traitement non-conformité sme", "analyse causes environnement", "causes racines sme", "correction non-conformité sme", "impacts environnementaux négatifs correction", "élimination causes sme"]
    },
    "ISO14001-10.3": {
        norm: "14001", clause: "10.3", weight: 1, criticality: "low",
        title: "Amélioration continue",
        keywords: ["amélioration continue environnement", "amélioration sme", "démarche amélioration environnementale", "progrès continu sme", "amélioration performance environnementale", "plan amélioration sme"]
    },

    // --- ISO 45001:2018 (SANTÉ & SÉCURITÉ) ---
    "ISO45001-4.1": {
        norm: "45001", clause: "4.1", weight: 3, criticality: "high",
        title: "Compréhension de l'organisme et de son contexte",
        keywords: ["contexte", "enjeux externes", "enjeux internes", "analyse contexte", "facteurs SST", "contexte organisation"]
    },
    "ISO45001-4.2": {
        norm: "45001", clause: "4.2", weight: 3, criticality: "high",
        title: "Besoins et attentes des travailleurs",
        keywords: ["parties intéressées", "travailleurs", "représentants", "besoins", "attentes", "exigences légales"]
    },
    "ISO45001-4.3": {
        norm: "45001", clause: "4.3", weight: 3, criticality: "high",
        title: "Détermination du domaine d'application",
        keywords: ["domaine application", "périmètre sst", "limites", "champ d'application"]
    },
    "ISO45001-4.4": {
        norm: "45001", clause: "4.4", weight: 3, criticality: "high",
        title: "Système de management de la S&ST",
        keywords: ["système management sst", "processus sst", "amélioration sst"]
    },
    "ISO45001-5.1": {
        norm: "45001", clause: "5.1", weight: 3, criticality: "high",
        title: "Leadership et engagement",
        keywords: ["leadership", "engagement direction", "responsabilité", "culture sst"]
    },
    "ISO45001-5.2": {
        norm: "45001", clause: "5.2", weight: 3, criticality: "high",
        title: "Politique de S&ST",
        keywords: ["politique sst", "santé sécurité", "engagement"]
    },
    "ISO45001-5.3": {
        norm: "45001", clause: "5.3", weight: 3, criticality: "high",
        title: "Rôles, responsabilités et autorités",
        keywords: ["rôles", "responsabilités", "autorités", "fonctions"]
    },
    "ISO45001-5.4": {
        norm: "45001", clause: "5.4", weight: 3, criticality: "high",
        title: "Consultation et participation des travailleurs",
        keywords: ["consultation", "participation", "représentants travailleurs", "dialogue", "obstacles"]
    },
    "ISO45001-6.1.1": {
        norm: "45001", clause: "6.1.1", weight: 3, criticality: "high",
        title: "Actions face aux risques et opportunités",
        keywords: ["risques", "opportunités", "planification", "incertitude"]
    },
    "ISO45001-6.1.2.1": {
        norm: "45001", clause: "6.1.2.1", weight: 3, criticality: "high",
        title: "Identification des dangers",
        keywords: ["identification dangers", "sources dangers", "situations dangereuses", "facteurs sociaux"]
    },
    "ISO45001-6.1.2.2": {
        norm: "45001", clause: "6.1.2.2", weight: 3, criticality: "high",
        title: "Évaluation des risques pour la S&ST",
        keywords: ["évaluation risques", "risques professionnels", "méthodologie"]
    },
    "ISO45001-6.1.3": {
        norm: "45001", clause: "6.1.3", weight: 3, criticality: "high",
        title: "Détermination des exigences légales",
        keywords: ["exigences légales", "conformité", "veille réglementaire", "lois travail"]
    },
    "ISO45001-6.2.1": {
        norm: "45001", clause: "6.2.1", weight: 3, criticality: "high",
        title: "Objectifs de S&ST",
        keywords: ["objectifs sst", "cibles", "santé", "sécurité", "prévention"]
    },
    "ISO45001-7.2": {
        norm: "45001", clause: "7.2", weight: 3, criticality: "high",
        title: "Compétences",
        keywords: ["compétences", "formation", "aptitude", "qualification"]
    },
    "ISO45001-7.3": {
        norm: "45001", clause: "7.3", weight: 3, criticality: "high",
        title: "Sensibilisation",
        keywords: ["sensibilisation", "culture", "droit de retrait", "conséquences"]
    },
    "ISO45001-8.1.1": {
        norm: "45001", clause: "8.1.1", weight: 2, criticality: "medium",
        title: "Planification et maîtrise opérationnelles",
        keywords: ["maîtrise opérationnelle", "processus", "contrôle"]
    },
    "ISO45001-8.1.2": {
        norm: "45001", clause: "8.1.2", weight: 2, criticality: "medium",
        title: "Élimination des dangers",
        keywords: ["hiérarchie", "élimination", "substitution", "protection collective", "epi"]
    },
    "ISO45001-8.1.4": {
        norm: "45001", clause: "8.1.4", weight: 2, criticality: "medium",
        title: "Achats et intervenants extérieurs",
        keywords: ["achats", "sous-traitants", "intervenants extérieurs", "coordination"]
    },
    "ISO45001-8.2": {
        norm: "45001", clause: "8.2", weight: 2, criticality: "medium",
        title: "Préparation et réponse aux situations d'urgence",
        keywords: ["urgence", "préparation", "réponse", "accidents", "exercices"]
    },
    "ISO45001-9.1.2": {
        norm: "45001", clause: "9.1.2", weight: 1, criticality: "low",
        title: "Évaluation de la conformité",
        keywords: ["évaluation conformité", "audit légal", "vérification"]
    },
    "ISO45001-9.2": {
        norm: "45001", clause: "9.2", weight: 1, criticality: "low",
        title: "Audit interne",
        keywords: ["audit interne", "programme audit", "vérification"]
    },
    "ISO45001-10.2": {
        norm: "45001", clause: "10.2", weight: 1, criticality: "low",
        title: "Incidents, non-conformités et actions correctives",
        keywords: ["non-conformité", "incident", "action corrective", "analyse causes"]
    }
};

module.exports = { RULES_DB };
