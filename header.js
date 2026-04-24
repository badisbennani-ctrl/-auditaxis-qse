// ============================================
// HEADER DYNAMIQUE - AUDITAXIS QSE
// Injection du header et gestion du menu hamburger
// ============================================

(function() {
    // Détecter la page active (supporte URLs avec ou sans .html)
    const currentPath = window.location.pathname;
    const rawPage = currentPath.split('/').pop() || 'index.html';
    const currentPage = rawPage.includes('.') ? rawPage : rawPage + '.html';

    // Mapping des pages pour la navigation
    const navItems = [
        { href: '/', label: 'Page d\'accueil', text: 'Accueil' },
        { href: '/expertise', label: 'Notre expertise QSE', text: 'Expertise' },
        { href: '/about', label: 'À propos de notre méthodologie', text: 'À Propos' },
        { href: '/checklist', label: 'Checklists ISO interactives', text: 'Checklists' },
        { href: '/glossaire', label: 'Glossaire des termes QSE', text: 'Glossaire' },
        { href: '/diagnostic', label: 'Diagnostic IA gratuit', text: 'Diagnostic IA' },
        { href: '/procedure', label: 'Générateur de procédures ISO', text: 'Générateur' },
        { href: '/contact', label: 'Contactez-nous', text: 'Contact' }
    ];

    // Construire les liens de navigation avec détection active
    const navLinks = navItems.map(item => {
        const isActive = currentPage === item.href ||
                        (currentPage === '' && item.href === 'index.html') ||
                        (currentPage === '/' && item.href === 'index.html');
        const activeClass = isActive ? 'class="active"' : '';
        const ariaCurrent = isActive ? 'aria-current="page"' : '';
        return `<li><a href="${item.href}" ${activeClass} ${ariaCurrent} aria-label="${item.label}">${item.text}</a></li>`;
    }).join('\n                    ');

    // Template du header
    const headerHTML = `
    <div class="loading-bar" id="loadingBar"></div>

    <header>
        <div class="container">
            <div class="logo">AuditAxis QSE</div>
            <button class="hamburger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="main-nav">
                <span></span><span></span><span></span>
            </button>
            <nav id="main-nav">
                <ul>
                    ${navLinks}
                </ul>
            </nav>
        </div>
    </header>
    `;

    // Template du footer
    const footerHTML = `
    <footer class="footer-enriched">
        <div class="footer-content">
            <div class="footer-column">
                <h4>Navigation</h4>
                <ul>
                    <li><a href="/">Accueil</a></li>
                    <li><a href="/expertise">Expertise</a></li>
                    <li><a href="/about">À Propos</a></li>
                    <li><a href="/checklist">Checklists</a></li>
                    <li><a href="/glossaire">Glossaire</a></li>
                    <li><a href="/diagnostic">Diagnostic IA</a></li>
                    <li><a href="/procedure">Générateur</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>Contact</h4>
                <ul>
                    <li>📧 contact@auditaxis-qse.com</li>
                    <li>📍 Campus Universitaire</li>
                    <li>🕐 Lun - Ven : 9h - 17h</li>
                </ul>
            </div>
            <div class="footer-column">
                <h4>AuditAxis QSE</h4>
                <p class="footer-slogan">"L'excellence QSE, certifiée et mesurée"</p>
                <div class="social-links">
                    <!-- Liens réseaux sociaux si besoin -->
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; <span id="footer-year">${new Date().getFullYear()}</span> AuditAxis QSE - Projet Académique. Tous droits réservés.</p>
        </div>
    </footer>
    `;

    // Injecter le header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.outerHTML = headerHTML;
    }

    // Injecter le footer
    const footerPlaceholder = document.querySelector('footer');
    if (footerPlaceholder) {
        footerPlaceholder.outerHTML = footerHTML;
    }

    // Initialiser le menu hamburger après injection
    initHamburgerMenu();

    // Fonction d'initialisation du menu hamburger
    function initHamburgerMenu() {
        const header = document.querySelector('header');
        const hamburger = document.querySelector('.hamburger');
        const nav = document.getElementById('main-nav');

        if (!hamburger || !nav || !header) return;

        hamburger.addEventListener('click', function() {
            const isOpen = header.classList.toggle('nav-open');
            this.setAttribute('aria-expanded', isOpen);
            this.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
        });

        // Fermer le menu quand on clique sur un lien
        nav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                header.classList.remove('nav-open');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.setAttribute('aria-label', 'Ouvrir le menu');
            });
        });

        // Fermer le menu quand on clique en dehors du header
        // Utiliser un seul listener global avec délégation d'événements
        document.addEventListener('click', function closeMenuOnClickOutside(e) {
            if (!header.contains(e.target)) {
                header.classList.remove('nav-open');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.setAttribute('aria-label', 'Ouvrir le menu');
                // Retirer ce listener après exécution pour éviter les fuites mémoire
                document.removeEventListener('click', closeMenuOnClickOutside);
            }
        });
    }

    // Mise à jour dynamique de l'année dans le footer
    function updateFooterYear() {
        const yearEl = document.getElementById('footer-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateFooterYear);
    } else {
        updateFooterYear();
    }
})();
