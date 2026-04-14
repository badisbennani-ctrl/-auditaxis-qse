# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AuditAxis QSE** - A professional website for QSE (Quality, Safety, Environment) Audit & Inspection Management. Features a hybrid AI diagnostic tool with local keyword-based analysis and optional Gemini AI backend API.

**Language**: French (all content)  
**Deployment**: Netlify (frontend static hosting), Render (backend API)

## Architecture

### Tech Stack
- **Frontend**: Pure HTML5/CSS3/ES6+ (no frameworks), header dynamically injected via `header.js`
- **Backend**: Node.js + Express.js (optional, only needed for Gemini AI integration)
- **AI Services**: Google Gemini Flash API (via backend), local keyword matching (client-side)
- **Deployment**: Netlify (frontend), Render (backend at `auditaxis-backend.onrender.com`)

### Frontend Structure
```
/
├── index.html          # Homepage with animated hero, statistics counters
├── about.html          # About project, ISO standards methodology
├── checklist.html      # Interactive ISO checklists with progress bars
├── diagnostic.html     # AI diagnostic interface
├── diagnostic.js       # Hybrid AI analysis (~650 lines, local + API)
├── glossaire.html      # QSE glossary with alphabetical navigation
├── contact.html        # Contact form with Netlify Forms
├── style.css           # Complete stylesheet (~650 lines, includes animations)
├── header.js           # Dynamic header injection and hamburger menu
├── 404.html            # Custom error page
├── _redirects          # Netlify URL rewrites
├── sitemap.xml         # SEO sitemap
└── robots.txt          # Search engine crawl instructions
```

### Backend Structure (backend/)
```
backend/
├── server.js           # Express server with rate limiting, CORS configured
├── package.json        # Dependencies: express, @google/generative-ai, cors, dotenv, express-rate-limit
├── .env                # Production environment variables (not in repo)
├── .env.example        # Template for GEMINI_API_KEY, PORT, CORS_ORIGIN
├── .git/               # Git repository (backend is separate, deploys to Render)
├── routes/
│   ├── diagnostic.js   # POST /api/diagnostic - Gemini AI analysis
│   ├── checklist.js    # POST/GET /api/checklist/save/:id - In-memory storage
│   └── contact.js      # POST /api/contact - Form validation
└── services/
    └── gemini.js       # Google Gemini Flash API integration
```

## Commands

### Frontend Development
```bash
# Serve static files locally (from root directory, not backend/)
python -m http.server 8000
npx serve .
# Or use VS Code Live Server extension
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Development with auto-reload (requires Node.js 18+ for --watch)
npm run dev

# Production start
npm start

# Server runs on http://localhost:3001
# Health check: http://localhost:3001/api/health
```

### Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and CORS_ORIGIN (e.g., http://localhost:8000)
```

### Testing Contact Form
The contact form uses Netlify Forms in production. For local testing, the backend validates at `/api/contact` but form submission requires Netlify's form handling or manual POST testing.

## Key Implementation Details

### Hybrid AI Diagnostic Architecture

The diagnostic system has **two modes** that work together:

**1. Local Analysis (Client-side, works offline)**
- Uses keyword matching against `NORMES` database in `diagnostic.js`
- Three-level conformity scoring: Conforme (1), Partiel (0.5), Non Conforme (0)
- Severity logic: Articles 4-7 → MAJEURE, Articles 8-10 → MINEURE

**2. Gemini AI Analysis (via Backend API)**
- Frontend calls `POST ${API_BASE}/api/diagnostic` when backend is available
- Backend responds with structured JSON containing non-conformities, conformities, recommendations
- Rate limited: 10 requests per 15 minutes per IP
- Frontend has cold-start detection (Render free tier sleeps after 15min)

**API Base URL**: `https://auditaxis-backend.onrender.com`

### Backend API Reference

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/health` | GET | Health check, returns `{status: 'ok', timestamp, uptime, version}` | 100/15min |
| `/api/diagnostic` | POST | AI analysis with Gemini Flash. Body: `{norme, description}` | 10/15min |
| `/api/checklist/save` | POST | Save checklist session. Body: `{norme, items, progression}`. Returns `sessionId` | 100/15min |
| `/api/checklist/:sessionId` | GET | Retrieve checklist by session ID | 100/15min |
| `/api/contact` | POST | Validate contact form. Body: `{nom, email, sujet, message}` | 100/15min |

**Note**: Checklist storage is in-memory only (Map). Data is lost on server restart.

### API Response Formats

**Diagnostic Response:**
```json
{
  "success": true,
  "data": {
    "score": 75,
    "non_conformites": [{ "titre", "article", "gravite", "probleme", "explication", "action_corrective" }],
    "conformites": [{ "description", "article", "statut" }],
    "recommandations": [{ "action", "priorite", "benefice" }]
  }
}
```

**Error Responses:** All errors return `{error: string, message: string}`. Common codes: `NORME_INVALIDE`, `DESCRIPTION_TROP_COURTE`, `AUTH_ERROR`, `RATE_LIMIT`.

### ISO Standards Database (NORMES)

Complete keyword rules for:
- **ISO 9001:2015** (Quality): 30 rules covering clauses 4.1-10.3
- **ISO 14001:2015** (Environment): 20 rules covering clauses 4.1-10.3
- **ISO 45001:2018** (Safety): 21 rules covering clauses 4.1-10.3

Each rule structure:
```javascript
{
    motsCles: ["keyword1", "keyword2", ...],
    article: "Art. X.X",
    titre: "Rule Title",
    conformite: "Conformity statement",
    explication: "Detailed explanation"
}
```

**NC d'absence logic** (`diagnostic.js`): Based on percentage of rules detected (not text length):
- `< 20%` rules detected → No absence NCs, show warning modal
- `20-50%` rules detected → Max 3 absence NCs, display "Analyse partielle" badge
- `>= 50%` rules detected → Max 5 absence NCs (full analysis)

### Design System

**Color Palette** (CSS custom properties in `style.css`):
```css
:root {
    --primary: #1e5f8c;        /* QSE Blue */
    --secondary: #2e8b57;      /* Environment Green */
    --accent: #f39c12;         /* Alert Orange */
    --accent-red: #e74c3c;     /* Safety Red */
}
```

**Navigation** (consistent across all pages, dynamically injected by `header.js`):
```
Accueil | À Propos | Checklists | Glossaire | Diagnostic IA | Contact
```

### Animations (style.css)

Key animation classes:
- `.card-animate` - Staggered reveal with delay-1 through delay-6
- `.standard-card-3d` - 3D perspective rotation on hover
- `.loading-bar` - Gradient progress animation

**Accessibility**: All infinite animations (`shimmer`, `pulse`, `float`, `loadingProgress`) are wrapped in `@media (prefers-reduced-motion: no-preference)` to respect user motion preferences.

### Responsive Navigation (header.js)

Mobile hamburger menu implementation:
- **CSS**: `.hamburger` button visible only under 768px (`display: none` above)
- **Animation**: 3 bars (25px × 3px, gap 5px) transform to X when `header.nav-open` class is present
- **Menu**: Absolute positioned below header (`top: 100%`), same gradient background, toggled via `display: flex/none`
- **Accessibility**: Animations wrapped in `@media (prefers-reduced-motion: no-preference)`, ARIA attributes on hamburger button
- **JavaScript**: `header.js` injects header and handles toggle logic, closes on link click or outside click

### Accessibility Features

- **Focus indicators**: `:focus-visible` with 3px solid primary outline and 2px offset
- **ARIA attributes**: `aria-label` on all nav links describing destination, `aria-current="page"` on active link, hamburger has `aria-expanded`, `aria-controls`
- **Semantic HTML**: `role="main"` on primary content sections
- **Screen reader support**: Hamburger button has dynamic `aria-label` ("Ouvrir/Fermer le menu")

### Checklist Persistence (localStorage)

Checklist progress automatically saved:
- **Keys**: `checklist_${checklistId}_item_${index}` (e.g., `checklist_iso9001_item_0`)
- **Save**: Triggered on every checkbox change via `updateProgress()`
- **Load**: Restored on `DOMContentLoaded` from localStorage
- **Reset**: Clears localStorage keys when `resetChecklist()` is called
- **Indicator**: "Progression sauvegardée automatiquement" text displayed under each checklist

### SEO & Open Graph

All pages include complete meta tags:
- **Open Graph**: `og:title`, `og:description`, `og:url`, `og:type`, `og:image`
- **Twitter Card**: `twitter:card`, `twitter:title`, `twitter:description`
- **Canonical URLs**: Absolute URLs with domain `https://auditaxis-qse.com`
- **Meta**: `author`, `description` with ISO keywords in French

### Netlify Configuration

**Forms** (`contact.html`):
```html
<form name="contact" method="POST" data-netlify="true">
    <input type="hidden" name="form-name" value="contact">
</form>
```

**Security Headers** (`netlify.toml`):
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME sniffing prevention
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: Restricts sources to self, backend API, and data: for images

**Redirects** (configured in `netlify.toml`):
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
2. Follow existing rule structure: `motsCles`, `article`, `titre`, `conformite`, `explication`
3. Test with diagnostic.html input matching the keywords
4. Verify syntax: `node --check diagnostic.js`

### Diagnostic Testing
```bash
# Verify JavaScript syntax before deployment
node --check diagnostic.js
```

### Adding a New Page
1. Create `page-name.html` (copy from index.html template, keep header-placeholder div)
2. Include `<script src="header.js"></script>` for dynamic navigation
3. Update `_redirects` with new route
4. Update `sitemap.xml`
5. Update `NAV_ITEMS` in `header.js` if adding to main navigation

### Modifying Backend API
1. Edit files in `backend/routes/` or `backend/services/`
2. Test locally with `npm run dev` (from backend/ directory)
3. Deploy to Render (pushes to connected git repo auto-deploy)

### Testing Diagnostic

**Sample inputs for testing:**
- ISO 9001: "Nous avons une politique qualité documentée et des objectifs SMART."
- ISO 14001: "Nous identifions nos aspects environnementaux et avons un plan de gestion des déchets."
- ISO 45001: "Nous avons des EPI pour les travailleurs mais pas de plan d'urgence testé."

**Backend health check:**
```bash
curl https://auditaxis-backend.onrender.com/api/health
```

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| `diagnostic.js` | ~2314 | Hybrid AI engine (local keyword + API fallback), modal logic, NC absence rules, 71 ISO rules |
| `style.css` | ~650 | All styling, animations, hamburger menu, accessibility |
| `header.js` | ~90 | Dynamic header injection, navigation active state, hamburger menu |
| `checklist.html` | ~450 | Interactive checklists with localStorage persistence |
| `backend/server.js` | ~200 | Express server, CORS, rate limiting, Helmet security |
| `backend/services/gemini.js` | ~110 | Gemini API integration with prompt engineering |
| `backend/routes/diagnostic.js` | ~85 | POST /api/diagnostic with validation |
| `backend/routes/checklist.js` | ~90 | In-memory checklist storage with Map |
| `backend/routes/contact.js` | ~75 | Contact form validation |

## Backend CORS Configuration

The backend accepts requests from:
- `https://auditaxis-qse.netlify.app` (default production)
- `https://auditaxisqse.netlify.app` (legacy Netlify URL)
- `http://localhost:5500`, `http://127.0.0.1:5500` (VS Code Live Server)
- `http://localhost:8000`, `http://127.0.0.1:8000` (Python/npx serve)

**Environment Variable**: Set `CORS_ORIGIN` in `.env` to add a custom production URL. The server uses a whitelist approach with dynamic origin validation.

## Git Structure

This project has a nested git repository:
- **Frontend root**: `/` (deployed to Netlify)
- **Backend**: `/backend/` (separate git repo, deployed to Render)

The backend has its own `.git/` directory and deploys independently to Render. When making changes, commit both repos separately.

## Cold Start Handling

The Render backend (free tier) sleeps after 15 minutes of inactivity. The frontend handles this:
- `wakeUpBackend()` called on page load (silent, 8s timeout)
- `checkServerHealth()` measures response time to detect cold state
- UI shows loading indicators when server is cold/waking up
- First diagnostic call may take 10-30s if server was asleep
