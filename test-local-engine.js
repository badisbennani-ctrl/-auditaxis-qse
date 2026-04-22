// Mock browser environment for Node.js
global.window = {
    AUDITAXIS_CONFIG: { 
        API_BASE_URL: 'mock-url',
        DIAGNOSTIC: {
            RATE_LIMIT_MS: 10000,
            MAX_LENGTH: 5000
        }
    },
    localStorage: {
        getItem: () => null,
        setItem: () => null
    },
    addEventListener: () => null
};
global.localStorage = global.window.localStorage;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
global.navigator = { onLine: true };
global.document = {
    createElement: () => ({ innerHTML: '' }),
    addEventListener: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null
};

const { analyserTexteLocal, NORMES } = require('./diagnostic.js');

/**
 * Test simple du moteur de diagnostic local
 */
function testDiagnostic() {
    console.log('🧪 Début des tests du moteur de diagnostic local...');

    const tests = [
        {
            name: "Test ISO 45001 - Conformité Basique",
            norme: "iso45001",
            text: "Nous avons une politique SST documentée et affichée. Les dangers sont identifiés et le DUER est à jour.",
            expectedMinScore: 30
        },
        {
            name: "Test ISO 9001 - Non-conformité citée",
            norme: "iso9001",
            text: "NC : Absence de revue de direction depuis 2 ans. Pas de processus de contrôle qualité.",
            expectedMinNC: 1
        },
        {
            name: "Test ISO 14001 - Analyse environnementale",
            norme: "iso14001",
            text: "L'analyse environnementale est réalisée. Nous trions les déchets et surveillons les rejets d'eau.",
            expectedMinScore: 20
        }
    ];

    let successCount = 0;

    tests.forEach(t => {
        try {
            console.log(`\n▶️ Test: ${t.name}`);
            const result = analyserTexteLocal(t.text, t.norme);
            
            let passed = true;
            if (t.expectedMinScore && result.score < t.expectedMinScore) {
                console.error(`❌ Échec score: attendu > ${t.expectedMinScore}, obtenu ${result.score}`);
                passed = false;
            }
            
            if (t.expectedMinNC && result.nonConformites.length < t.expectedMinNC) {
                console.error(`❌ Échec NC: attendu > ${t.expectedMinNC}, obtenu ${result.nonConformites.length}`);
                passed = false;
            }

            if (passed) {
                console.log(`✅ Réussite (Score: ${result.score}%, NC: ${result.nonConformites.length})`);
                successCount++;
            }
        } catch (err) {
            console.error(`💥 Erreur lors du test ${t.name}:`, err.message);
        }
    });

    console.log(`\n📊 Résultats: ${successCount}/${tests.length} tests réussis.`);
    
    if (successCount === tests.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

// Mock document for JSDOM-less environment
global.document = {
    createElement: () => ({ innerHTML: '' })
};

testDiagnostic();
