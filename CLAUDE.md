# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AuditAxis QSE** - Professional website for QSE (Quality, Safety, Environment) Audit & Inspection Management. Features a hybrid AI diagnostic tool with local keyword-based analysis and optional Gemini AI backend API.

**Language**: French (all content)  
**Deployment**: Vercel (frontend static hosting), Render (backend API)

## Architecture

### Tech Stack
- **Frontend**: Pure HTML5/CSS3/ES6+ (no frameworks), header dynamically injected via `header.js`
- **Backend**: Node.js + Express.js with Google Gemini Flash API
- **AI Services**: Local keyword matching (client-side) + Gemini AI API (server-side)
- **Deployment**: Netlify (frontend), Render (backend at `auditaxis-backend-4g3g.onrender.com`)

### Frontend Structure
```
/
├── index.html          # Homepage with animated hero, statistics counters
├── about.html          # About project, ISO standards methodology
├── checklist.html      # Interactive ISO checklists with localStorage persistence
├── diagnostic.html     # AI diagnostic interface
├── diagnostic.js       # Hybrid AI analysis, NORMES database (71 ISO rules)
├── glossaire.html      # QSE glossary with alphabetical navigation
├── contact.html        # Contact form (POST to backend API)
├── style.css           # Complete stylesheet with animations
├── header.js           # Dynamic header injection and hamburger menu
├── 404.html            # Custom error page
├── _redirects          # URL rewrites for clean URLs
├── sitemap.xml         # SEO sitemap
└── robots.txt          # Search engine crawl instructions
```

### Backend Structure (backend/)
Separate git repository: `auditaxis-backend`
```
backend/
├── index.js            # Express app entry point, CORS, route registration
├── package.json        # Dependencies: express, @google/generative-ai, cors, dotenv, nodemailer
├── .env.example        # Template for GEMINI_API_KEY, PORT, EMAIL_USER, EMAIL_PASS
├── routes/
│   ├── diagnostic.js   # POST /api/diagnostic - Gemini AI analysis with validation
│   ├── checklist.js    # POST/GET /api/checklist - In-memory session storage (Map)
│   └── contact.js      # POST /api/contact - Form validation (nom, email, sujet, message)
└── services/
    └── gemini.js       # Google Gemini Flash API integration with prompt engineering
```

## Commands

### Frontend Development
```bash
# Serve static files locally
python -m http.server 8000
npx serve .
# Or use VS Code Live Server extension

# Deploy to Vercel
vercel deploy --prod
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Development with auto-reload (Node.js 18+)
npm run dev

# Production start
npm start

# Health check
curl http://localhost:3001/api/health
```

### Environment Setup (Backend)
```bash
cd backend
cp .env.example .env
# Edit .env with GEMINI_API_KEY, PORT, EMAIL_USER, EMAIL_PASS, CORS_ORIGIN
```

## Backend API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check, returns `{"status":"ok","timestamp","uptime","version"}` |
| `/api/diagnostic` | POST | AI analysis with Gemini Flash. Body: `{norme, description}` |
| `/api/checklist/save` | POST | Save checklist session. Body: `{norme, items, progression}` |
| `/api/checklist/:sessionId` | GET | Retrieve checklist by session ID |
| `/api/contact` | POST | Validate contact form. Body: `{nom, email, sujet, message}` |

**Note**: Checklist storage is in-memory only (Map). Data lost on server restart.

**API Base URL**: `https://auditaxis-backend-4g3g.onrender.com`

### Hybrid AI Diagnostic Architecture

**1. Local Analysis (Client-side, offline)**
- Keyword matching against `NORMES` database in `diagnostic.js`
- 3-level scoring: Conforme (1), Partiel (0.5), Non Conforme (0)
- Severity: Articles 4-7 → MAJEURE, Articles 8-10 → MINEURE

**2. Gemini AI Analysis (Backend API)**
- Cold-start detection (Render free tier sleeps after 15min)
- Frontend shows loading indicators during wake-up

### ISO Standards Database (NORMES)

Located in `diagnostic.js`. Keyword rules for:
- **ISO 9001:2015** (Quality): 30 rules, clauses 4.1-10.3
- **ISO 14001:2015** (Environment): 20 rules, clauses 4.1-10.3
- **ISO 45001:2018** (Safety): 22 rules, clauses 4.1-10.2

Rule structure:
```javascript
{
    motsCles: ["keyword1", "keyword2", ...],
    article: "Art. X.X",
    titre: "Rule Title",
    conformite: "Conformity statement",
    explication: "Detailed explanation"
}
```

**NC d'absence logic**: Based on percentage of rules detected:
- `< 20%` → No absence NCs, show warning modal
- `20-50%` → Max 3 absence NCs
- `>= 50%` → Max 5 absence NCs (full analysis)

### Design System

**Color Palette** (`style.css`):
```css
:root {
    --primary: #1e5f8c;        /* QSE Blue */
    --secondary: #2e8b57;      /* Environment Green */
    --accent: #f39c12;         /* Alert Orange */
    --accent-red: #e74c3c;     /* Safety Red */
}
```

**Navigation** (injected by `header.js`):
```
Accueil | À Propos | Checklists | Glossaire | Diagnostic IA | Contact
```

### Key Animations (`style.css`)

- `.card-animate` - Staggered reveal (delay-1 through delay-6)
- `.standard-card-3d` - 3D perspective rotation on hover
- `.loading-bar` - Gradient progress animation

**Accessibility**: Infinite animations wrapped in `@media (prefers-reduced-motion: no-preference)`.

### Responsive Navigation (`header.js`)

Hamburger menu (visible < 768px):
- 3 bars transform to X when `header.nav-open` class is present
- Closes on link click or outside click
- ARIA attributes: `aria-expanded`, `aria-controls`, `aria-label`

### Accessibility Features

- `:focus-visible` with 3px solid primary outline, 2px offset
- `aria-label` on nav links, `aria-current="page"` on active link
- `role="main"` on primary content sections

### Checklist Persistence (`checklist.html`)

- **Keys**: `checklist_${id}_item_${index}` (localStorage)
- **Auto-save**: On every checkbox change via `updateProgress()`
- **Reset**: Clears localStorage keys

### SEO & Open Graph

All pages include: `og:title`, `og:description`, `og:url`, `og:type`, `og:image`, Twitter Card, canonical URLs.

### URL Redirects (`_redirects`)

- `/contact` → `/contact.html`
- `/about` → `/about.html`
- `/home` → `/index.html`
- `/checklist` → `/checklist.html`
- `/glossaire` → `/glossaire.html`
- `/diagnostic` → `/diagnostic.html`
- `/*` → `/index.html` (SPA fallback)

## Common Tasks

### Adding an ISO Rule
1. Edit `diagnostic.js` → `NORMES` object (iso9001, iso14001, or iso45001)
2. Follow structure: `motsCles`, `article`, `titre`, `conformite`, `explication`
3. Verify syntax: `node --check diagnostic.js`

### Adding a New Page
1. Create `page-name.html` (copy template, keep `header-placeholder` div)
2. Include `<script src="header.js"></script>` for dynamic navigation
3. Update `_redirects` and `sitemap.xml`
4. Update `navItems` in `header.js`

### Backend API Changes
1. Edit files in `backend/routes/` or `backend/services/`
2. Test locally: `npm run dev` (from `backend/`)
3. Deploy: `git push origin main` (auto-deploys to Render)

### Testing Diagnostic

**Sample inputs:**
- ISO 9001: "Nous avons une politique qualité documentée et des objectifs SMART."
- ISO 14001: "Nous identifions nos aspects environnementaux et avons un plan de gestion des déchets."
- ISO 45001: "Nous avons des EPI pour les travailleurs mais pas de plan d'urgence testé."

**Health check:**
```bash
curl https://auditaxis-backend-4g3g.onrender.com/api/health
```

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `diagnostic.js` | ~2314 | Hybrid AI engine, NORMES database (71 ISO rules) |
| `style.css` | ~1100 | All styling, animations, responsive, accessibility |
| `header.js` | ~105 | Dynamic header injection, hamburger menu |
| `checklist.html` | ~450 | Interactive checklists with localStorage |
| `contact.html` | ~440 | Contact form with backend API integration |
| `backend/index.js` | ~45 | Express app, CORS, route registration |
| `backend/services/gemini.js` | ~110 | Gemini API integration |
| `backend/routes/diagnostic.js` | ~135 | POST /api/diagnostic with validation |
| `backend/routes/checklist.js` | ~90 | In-memory checklist storage |
| `backend/routes/contact.js` | ~75 | Contact form validation |

## Git Structure

Two separate repositories:
- **Frontend**: `auditaxis-frontend` (this repo) → Deployed to Vercel
- **Backend**: `auditaxis-backend` → Deployed to Render

Commit and push each repo separately.

## Security Notes

- XSS prevention: `escapeHTML()` function in `diagnostic.js` sanitizes backend data before DOM injection
- Contact form: `sanitizeInput()` removes HTML tags, JS protocols, event handlers
- CSRF: Honeypot field on contact form blocks basic bots
- CSP: Content Security Policy headers in `index.html` and `diagnostic.html`

## Cold Start Handling

Render backend (free tier) sleeps after 15min inactivity. Frontend handles this:
- `wakeUpBackend()` on page load (silent, 8s timeout)
- UI shows "Connexion au serveur..." after 5s delay
- First API call may take 10-30s if server was asleep
