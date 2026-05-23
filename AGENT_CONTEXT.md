# 🔄 Haazir AI — Agent Handoff Context
## Paste this to any new Antigravity agent session to catch up instantly
## Last updated: May 17, 2026 — 5:19 PM PKT

---

### WHAT IS THIS PROJECT?
**Haazir AI** — a mobile app for **Google Antigravity Hackathon (Challenge 2)**. It's an AI agent that lets users request ANY service (plumber, food, electrician, etc.) via chat. The AI understands the request (Urdu/English/Roman Urdu), finds providers via Google Places API, ranks them using 8 factors, contacts them via WhatsApp, books the service, and collects feedback.

### DEADLINE: May 20, 2026

### HACKATHON RULES (Critical)
- **Mobile APK is MANDATORY** (we use React Native + Expo)
- **Google Antigravity must be the PRIMARY orchestrator** (all code built here)
- **Must submit**: APK, demo video (3-5 min), Antigravity usage video (2-3 min), agent traces/logs, README
- **Evaluation**: Matching quality 25%, Antigravity integration 20%, Multilingual 15%, Scheduling/Pricing 15%, Disputes/Reliability 15%, Innovation/UX 10%

### TECH STACK
| Component | Technology |
|---|---|
| Mobile App | React Native + Expo |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google Sign-In) |
| AI/LLM | Gemini 2.5 Flash API |
| Maps | Google Places API (New) |
| WhatsApp | WAHA (self-hosted Docker) + n8n workflows |
| Hosting | Google Cloud Run (or local for demo) |

### PROJECT STRUCTURE
```
c:\Users\muzai\Desktop\Google Antigravity Hackathon\
├── haazir-app/               ← React Native Expo mobile app
│   ├── app/_layout.tsx       ← Root layout (dark theme)
│   ├── app/index.tsx         ← Welcome screen (animated, gorgeous)
│   ├── app/onboarding.tsx    ← 3-step profile setup
│   ├── app/chat.tsx          ← Main chat with provider cards
│   ├── app/confirm.tsx       ← Booking confirm + price + WhatsApp preview
│   ├── app/feedback.tsx      ← Star rating + review
│   ├── app.json              ← Expo config (com.haazir.ai)
│   └── google-services.json  ← Firebase Android config
├── haazir-backend/           ← Node.js Express API (port 3001)
│   ├── index.js              ← Server entry, all routes mounted
│   ├── .env                  ← API keys
│   ├── agents/
│   │   ├── intentAgent.js    ← Gemini NLU (multilingual)
│   │   ├── discoveryAgent.js ← Google Places search
│   │   ├── matchingAgent.js  ← 8-factor ranking
│   │   ├── pricingAgent.js   ← Dynamic PKR pricing
│   │   ├── schedulingAgent.js← Time parsing & conflicts
│   │   └── qualityAgent.js   ← Disputes & review sentiment
│   ├── services/
│   │   ├── firebase.js       ← Firestore operations
│   │   ├── traceLogger.js    ← Agent trace logging (OODA format)
│   │   └── geminiHelper.js   ← Centralized Gemini API with retry/backoff
│   ├── routes/
│   │   ├── chat.js           ← Main orchestration (all 6 agents)
│   │   ├── providers.js      ← Provider search endpoint
│   │   ├── bookings.js       ← Booking CRUD + WhatsApp msg gen + auto-replace
│   │   ├── feedback.js       ← Review submission + reputation scoring
│   │   ├── webhooks.js       ← WhatsApp in/out with AI reply parsing
│   │   └── traces.js         ← Trace export for submission
│   └── n8n-workflows/
│       ├── send-whatsapp.json    ← n8n workflow: send via WAHA
│       └── receive-whatsapp.json ← n8n workflow: receive + forward
├── README.md                 ← Comprehensive documentation
├── AGENT_CONTEXT.md          ← THIS FILE
├── task.md                   ← Full checklist with progress
├── PROGRESS_UPDATE.md        ← Detailed progress report
└── HAAZIR_ARCHITECTURE_PLAN.md ← Architecture + data flow
```

### 6 AI AGENTS (All Built + Tested ✅)
1. **Intent Agent** — NLU, entity extraction, confidence scoring (gemini-2.5-flash)
2. **Discovery Agent** — Google Places API search + distance (no Gemini)
3. **Matching Agent** — 8-factor provider ranking with AI reasoning (gemini-2.5-flash)
4. **Pricing Agent** — Dynamic pricing with PKR breakdown (gemini-2.5-flash)
5. **Scheduling Agent** — Time conflicts, alternatives (gemini-2.5-flash)
6. **Quality Agent** — Feedback, disputes (6 types), reputation, sentiment (gemini-2.5-flash)

### KEY DECISIONS ALREADY MADE
- Name: **Haazir AI**
- Model: **gemini-2.5-flash** (gemini-2.0-flash has zero quota on current key)
- WhatsApp: dedicated business SIM, WAHA gateway, n8n workflows
- Human-in-the-loop: user confirms every WhatsApp message before sending
- Location: works anywhere (Google Places), 30-40km radius from user
- Provider numbers: extracted from Google Places API phone field
- APK build: via `eas build -p android --profile preview`
- Retry logic: automatic 429 retry with exponential backoff (geminiHelper.js)

### API KEYS (all stored in `haazir-backend/.env`)
- **Google Maps key**: `AIzaSy...YOUR_KEY_HERE` (works for Places API)
- **Gemini key**: `AIzaSy...YOUR_KEY_HERE` (Working ✅ — gemini-2.5-flash)
- **Firebase project**: `haazir-ai-496420`
- **Firebase App ID**: `1:491138345859:android:ed52fa670db28bdc4524b6`

### CURRENT PROGRESS — ~85% complete
**Fully built & tested:**
- All 6 AI agents (migrated to gemini-2.5-flash)
- All backend API routes (chat, providers, bookings, feedback, webhooks, traces)
- Agent trace logger with JSON export (OODA format)
- Gemini retry helper with backoff (handles 429s)
- Firebase Firestore service
- 6 mobile app screens (welcome, onboarding, chat, confirm, feedback, layout)
- n8n workflow JSONs (send + receive WhatsApp)
- Provider reputation scoring system (0-100 scale + trends)
- Auto-replacement for cancelled providers
- AI-powered WhatsApp reply parsing
- Review sentiment analysis (Urdu/English/Roman Urdu)
- Comprehensive README.md with all required sections
- google-services.json placed in app

**Still pending:**
- Google Sign-In screen (C1) — nice-to-have
- Voice input (C4) — nice-to-have
- Docker + WAHA + n8n setup (user task — installing Docker)
- WhatsApp SIM (user task)
- Import n8n workflows (user task — after Docker)
- UI polish (N1-N4) — animations, loading states, app icon
- APK build (P1-P4) — needs Expo account
- Demo videos (Q1-Q2) — user task
- Final submission (S1-S6) — user task

### WHAT TO DO WHEN RESUMING
1. Backend is ready — `cd haazir-backend && npm start`
2. Test: `POST http://localhost:3001/api/chat/send` with message + userId + location
3. For WhatsApp: User needs Docker → WAHA → n8n → import workflows
4. For APK: User needs Expo account → `eas build -p android --profile preview`
5. Remaining code tasks: C1 (Google Sign-In), C4 (Voice), N1-N4 (UI polish)

### REFERENCE FILES
- Task checklist: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\task.md`
- README: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\README.md`
- Architecture: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\HAAZIR_ARCHITECTURE_PLAN.md`
- Progress: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\PROGRESS_UPDATE.md`
