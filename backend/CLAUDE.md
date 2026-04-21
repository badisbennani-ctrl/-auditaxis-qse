# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AuditAxis Backend** - Node.js/Express API for QSE (Quality, Safety, Environment) audit diagnostics. Provides hybrid AI analysis using Google Gemini Flash API with local keyword-based fallback.

**Deployment**: Render (https://auditaxis-backend.onrender.com)

## Commands

```bash
# Install dependencies
npm install

# Development with auto-reload (Node.js 18+)
npm run dev

# Production start
npm start

# Syntax validation
node --check index.js
```

## Architecture

### Tech Stack
- **Runtime**: Node.js with CommonJS modules
- **Framework**: Express.js (v5)
- **AI Service**: Google Gemini Flash API (`@google/generative-ai`) + embeddings (`text-embedding-004`)
- **Email**: Resend (`resend`) with fallback mode when API key missing
- **Security**: Helmet, CORS whitelist, rate limiting per endpoint

### File Structure
```
backend/
├── index.js              # Express app entry, CORS, rate limiting, health endpoint
├── package.json          # Dependencies and scripts
├── .env.example          # Required env vars template
├── routes/
│   ├── diagnostic.js     # POST /api/diagnostic - Hybrid AI analysis (Gemini + fallback local)
│   ├── checklist.js      # GET/POST /api/checklist - In-memory session storage (Map)
│   └── contact.js        # POST /api/contact - Form validation with Resend email
└── services/
    ├── gemini.js         # Google Gemini API integration (chat + embeddings)
    ├── qse-engine.js     # Scoring engine with hybrid validation (keywords + vector similarity)
    └── rules-db.js       # ISO rules database (keywords, weights, criticality)
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with env status (`{status, timestamp, uptime, env}`) |
| `/api/diagnostic` | POST | Hybrid AI analysis. Body: `{description}`. Returns scores for ISO 9001/14001/45001 |
| `/api/checklist/save` | POST | Save checklist session. Body: `{norme, items, progression}` |
| `/api/checklist/:sessionId` | GET | Retrieve checklist by session ID |
| `/api/contact` | POST | Contact form. Body: `{nom, email, sujet, message, company?}` |

### Environment Variables

Required in `.env` (not committed to git):
```
GEMINI_API_KEY=your_api_key       # Required for AI analysis
RESEND_API_KEY=re_xxxxx           # Required for email sending (fallback mode if missing)
EMAIL_TO=recipient@domain.com     # Contact form recipient
CORS_ORIGIN=https://auditaxis-qse.com  # Frontend principal en production pour la sécurité CORS
PORT=3001                         # Optional, defaults to 3001
```

### Key Implementation Details

**Hybrid AI Diagnostic** (`routes/diagnostic.js`):
- Runs 3 parallel audits (ISO 9001, 14001, 45001) via Gemini
- Falls back to local keyword analysis if Gemini unavailable
- Scoring via `qse-engine.js` with cosine similarity validation

**Gemini Service** (`services/gemini.js`):
- Uses `gemini-1.5-flash` for analysis, `text-embedding-004` for embeddings
- Graceful degradation: returns `[]` if API key missing
- Prompt engineering for strict JSON output with rule ID validation

**QSE Engine** (`services/qse-engine.js`):
- Hybrid validation: keywords (≥2 matches = valid) + vector similarity (>0.75 = valid)
- Scoring: COMPLIANT=100%, OBSERVATION=50%, NON_CONFORM_CRITICAL=-150%
- Risk levels: `critical` (any critical NC), `high` (<40), `medium` (40-75), `low` (≥75)

**Rules Database** (`services/rules-db.js`):
- 17 ISO rules across 3 standards (9001, 14001, 45001)
- Structure: `{norm, clause, weight, criticality, title, keywords}`

**Email Service** (`routes/contact.js`):
- Lazy Resend initialization to prevent crash on missing API key
- Fallback mode: logs email content, returns success without sending

**Security** (`index.js`):
- Helmet for HTTP headers
- Rate limiting: 100 req/15min on `/api/*`, 3 req/5min on `/api/contact`
- CORS with whitelist, `trust proxy` for Render

## Git Structure

Standalone repository (`auditaxis-backend`) separate from frontend. Auto-deploys to Render on push to `main`.
