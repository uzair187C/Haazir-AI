# 🚀 Haazir AI — حاضر (At Your Service)

> **AI-Powered Multi-Service Orchestrator for Pakistan**
> Google Antigravity Hackathon 2026 — Challenge 2

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Android-blue)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)
![Language](https://img.shields.io/badge/Languages-Urdu%20%7C%20English%20%7C%20Roman%20Urdu-purple)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [AI Agents](#ai-agents)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [API Endpoints](#api-endpoints)
- [Baseline Comparison](#baseline-comparison)
- [Cost & Scalability](#cost--scalability)
- [Privacy & Safety](#privacy--safety)
- [Limitations](#limitations)
- [Demo](#demo)

---

## 🎯 Overview

**Haazir AI** (حاضر — "At Your Service") is a mobile-first AI agent that lets users request **any service** — plumber, electrician, food delivery, mechanic, tutor, or more — through natural conversation in **Urdu, Roman Urdu, or English**.

The system uses **6 specialized AI agents** orchestrated together to:
1. **Understand** the user's intent (multilingual NLU)
2. **Discover** real service providers via Google Places API
3. **Rank** them using an 8-factor matching algorithm
4. **Price** the service dynamically in PKR
5. **Schedule** with conflict detection
6. **Contact** providers via WhatsApp with human-in-the-loop approval
7. **Monitor quality** through reviews, disputes, and reputation scoring

### The Problem

In Pakistan, finding a reliable service provider is a fragmented experience:
- **No single platform** covers all services (plumber, food, electrician, etc.)
- **Language barriers** — most apps are English-only, but users speak Urdu/Roman Urdu
- **Trust deficit** — no transparent pricing or quality guarantees
- **Manual discovery** — users rely on word-of-mouth or scattered Google searches
- **No accountability** — no dispute resolution or provider reputation tracking

### Our Solution

Haazir AI combines **conversational AI + real-time provider discovery + WhatsApp communication** into one unified experience. Users simply tell the AI what they need in their preferred language, and the system handles everything — from finding the best provider to negotiating price and scheduling.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **Multilingual NLU** | Understands Urdu, Roman Urdu, English, and code-switched messages |
| 📍 **Real Provider Discovery** | Finds actual businesses via Google Places API (New) |
| ⚖️ **8-Factor Matching** | Ranks providers by distance, rating, reviews, availability, price, specialization, recency, reliability |
| 💰 **Dynamic Pricing** | AI-generated PKR estimates with breakdown (base, travel, urgency, time premium) |
| 📅 **Smart Scheduling** | Parses natural time expressions ("kal subah 10 bajay"), detects conflicts, suggests alternatives |
| 📱 **WhatsApp Integration** | Contacts providers via WhatsApp with AI-crafted messages (WAHA + n8n) |
| 👤 **Human-in-the-Loop** | User reviews and approves every WhatsApp message before sending |
| ⭐ **Quality & Disputes** | 6 dispute types with AI resolution + provider reputation scoring |
| 🔄 **Auto-Replacement** | If provider cancels, AI automatically finds the next best alternative |
| 📊 **Agent Trace Logging** | Every AI decision logged in OODA format for full transparency |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HAAZIR AI MOBILE APP                      │
│           React Native + Expo (Android APK)                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │ Welcome  │ │Onboarding│ │  Chat   │ │ Confirm/Feedback │ │
│  └──────────┘ └──────────┘ └────┬────┘ └──────────────────┘ │
└──────────────────────────────────┼──────────────────────────┘
                                   │ REST API
┌──────────────────────────────────┼──────────────────────────┐
│              HAAZIR AI BACKEND (Node.js + Express)           │
│                                  │                           │
│  ┌───────────────────────────────┼────────────────────────┐  │
│  │         ORCHESTRATION LAYER (routes/chat.js)           │  │
│  │                               │                        │  │
│  │  ┌─────────┐  ┌──────────┐  ┌┴────────┐  ┌─────────┐ │  │
│  │  │ Intent  │→ │Discovery │→ │Matching │→ │ Pricing │ │  │
│  │  │ Agent   │  │ Agent    │  │ Agent   │  │ Agent   │ │  │
│  │  └─────────┘  └──────────┘  └─────────┘  └─────────┘ │  │
│  │       │            │             │             │       │  │
│  │  ┌────┴────┐  ┌────┴────┐                             │  │
│  │  │Schedule │  │Quality  │     Agent Trace Logger       │  │
│  │  │ Agent   │  │ Agent   │     (OODA Format)            │  │
│  │  └─────────┘  └─────────┘                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Google Places│  │ Gemini 2.5    │  │  Firebase       │  │
│  │ API (New)    │  │ Flash API     │  │  Firestore      │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│          WHATSAPP PIPELINE (Docker)                           │
│  ┌────────┐    ┌────────┐    ┌─────────────┐                │
│  │ Backend│───→│  n8n   │───→│ WAHA        │───→ WhatsApp   │
│  │ API    │←───│Workflow│←───│ (Gateway)   │←─── Provider   │
│  └────────┘    └────────┘    └─────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Agents

### 1. Intent Agent (NLU)
- **Role**: Understands what the user needs from natural language
- **Model**: Gemini 2.5 Flash
- **Capabilities**: Entity extraction (service, location, time, urgency, budget), language detection, confidence scoring
- **Languages**: Urdu, Roman Urdu, English, code-switched

### 2. Discovery Agent
- **Role**: Finds real service providers near the user
- **Source**: Google Places API (New) — Text Search
- **Data**: Name, rating, reviews, phone, address, hours, distance
- **Coverage**: 14+ service categories, 30km radius

### 3. Matching Agent
- **Role**: Ranks providers using 8 weighted factors
- **Factors**: Distance (15%), Rating (20%), Review Volume (10%), Review Recency (10%), Availability (10%), Price Match (10%), Specialization (15%), Reliability (10%)
- **Dynamic Weights**: Adjusts based on user preferences (budget → price weight ↑, urgent → availability weight ↑)
- **AI Reasoning**: Generates human-readable explanations for each ranking

### 4. Pricing Agent
- **Role**: Estimates service cost in PKR
- **Components**: Base fee, travel charge, urgency surcharge, time premium, budget discount
- **Confidence**: Low/Medium/High based on data availability

### 5. Scheduling Agent
- **Role**: Parses natural time expressions and detects conflicts
- **Handles**: "kal subah 10 bajay", "next Monday 3pm", "abhi" (now)
- **Features**: Conflict detection, alternative time suggestions, urgency flagging

### 6. Quality Agent
- **Role**: Handles disputes and provider reputation
- **Dispute Types**: No-show, bad quality, price disagreement, late arrival, cancellation, other
- **Reputation**: Score (0-100), trend tracking, service breakdown
- **Sentiment**: Analyzes review text (Urdu/English/Roman Urdu)

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile App | React Native + Expo | Cross-platform Android app |
| Backend | Node.js + Express | API server, agent orchestration |
| AI/LLM | Gemini 2.5 Flash | NLU, reasoning, pricing, scheduling |
| Maps | Google Places API (New) | Provider discovery + details |
| Database | Firebase Firestore | User profiles, bookings, reviews |
| Auth | Firebase Auth | Google Sign-In |
| WhatsApp | WAHA (Docker) + n8n | Provider communication gateway |
| Tracing | Custom OODA Logger | Agent decision transparency |

---

## 🔧 Setup & Installation

### Prerequisites
- Node.js v20+
- Docker Desktop (for WhatsApp integration)
- Android phone or emulator (for mobile app)
- Google Cloud project with APIs enabled

### Backend Setup

```bash
# 1. Navigate to backend
cd haazir-backend

# 2. Install dependencies
npm install

# 3. Configure environment
# Edit .env with your API keys:
#   GOOGLE_API_KEY=your_places_api_key
#   GEMINI_API_KEY=your_gemini_api_key

# 4. Start server
npm start
# Server runs on http://localhost:3001
```

### Mobile App Setup

```bash
# 1. Navigate to app
cd haazir-app

# 2. Install dependencies
npm install

# 3. Start Expo dev server
npx expo start

# 4. Scan QR code with Expo Go app on Android
```

### WhatsApp Setup (Docker)

```bash
# 1. Start WAHA (WhatsApp gateway)
docker run -d --name waha -p 3000:3000 devlikeapro/waha

# 2. Start n8n (workflow automation)
docker run -d --name n8n -p 5678:5678 -e WEBHOOK_URL=http://localhost:5678 n8nio/n8n

# 3. Open WAHA dashboard: http://localhost:3000
#    → Start session → Scan QR with WhatsApp phone

# 4. Open n8n: http://localhost:5678
#    → Import workflows from haazir-backend/n8n-workflows/
```

### Build APK

```bash
cd haazir-app
eas build -p android --profile preview
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + agent status |
| `POST` | `/api/chat/send` | Main chat — runs all 6 agents |
| `GET` | `/api/chat/history/:userId` | Chat history |
| `POST` | `/api/providers/find` | Search providers by service + location |
| `POST` | `/api/bookings/create` | Create a booking |
| `GET` | `/api/bookings/:id` | Get booking details |
| `PATCH` | `/api/bookings/:id/status` | Update booking status |
| `POST` | `/api/bookings/:id/generate-message` | AI-generate WhatsApp message |
| `POST` | `/api/bookings/:id/cancel-replace` | Auto-find replacement provider |
| `POST` | `/api/feedback/submit` | Submit review + update reputation |
| `GET` | `/api/feedback/provider/:phone` | Get provider reviews |
| `GET` | `/api/feedback/reputation/:phone` | Get reputation score |
| `GET` | `/api/traces/export` | Export all agent traces (JSON) |
| `POST` | `/api/webhooks/whatsapp-incoming` | Receive WhatsApp replies |
| `POST` | `/api/webhooks/send-whatsapp` | Send WhatsApp via n8n/WAHA |

---

## 📊 Baseline Comparison

### Agentic vs. Manual Approach

| Metric | Manual Approach | Haazir AI (Agentic) | Improvement |
|--------|----------------|---------------------|-------------|
| **Time to find provider** | 15-30 min (Google, call multiple) | 10-15 seconds | **~100x faster** |
| **Language support** | English only (most apps) | Urdu + Roman Urdu + English | **3x coverage** |
| **Provider comparison** | Manual, 1-2 at a time | 8-factor automated ranking | **Systematic** |
| **Price transparency** | None until provider arrives | AI estimate before booking | **Full visibility** |
| **Communication** | Manual calls, repetitive | AI-crafted WhatsApp messages | **Automated** |
| **Dispute handling** | None / informal | 6-type AI resolution | **Structured** |
| **Provider tracking** | None | Reputation scoring + trends | **Data-driven** |
| **Service coverage** | Separate app per service | All services in one chat | **Unified** |

### Antigravity Integration

Google Antigravity (this AI coding assistant) was the **primary orchestrator** for building Haazir AI:
- **Planning**: Architecture design, task breakdown, technical decisions
- **Implementation**: All 6 agents, all routes, all screens, API integrations
- **Debugging**: API key issues, quota handling, error recovery
- **Documentation**: README, architecture docs, task tracking

---

## 💰 Cost & Scalability

### Current Costs (Free Tier)

| Resource | Free Tier Limit | Our Usage |
|----------|----------------|-----------|
| Gemini API | 20 req/day (2.5 Flash) | ~4-5 calls per chat session |
| Google Places API | $200/month credit | ~10 searches per session |
| Firebase Firestore | 50K reads/day | Minimal during demo |
| WAHA | Free (self-hosted) | Unlimited |

### Production Scaling

| Scale | Monthly Cost (Est.) | Notes |
|-------|-------------------|-------|
| 100 users/day | $15-25 | Gemini pay-as-you-go + Places API |
| 1,000 users/day | $80-150 | Cloud Run auto-scaling |
| 10,000 users/day | $500-800 | Dedicated instances + caching |

### Optimization Strategies
- **Cache** frequently searched services/locations
- **Rate limiting** to manage API costs
- **Batch** Gemini calls where possible
- **Edge caching** for provider data (5-min TTL)

---

## 🔒 Privacy & Safety

### Data Handling
- **Location**: Only used for provider search; never stored permanently
- **Chat history**: Session-based (in-memory); cleared on server restart
- **Phone numbers**: Provider phones from public Google Places data only
- **No PII collection**: We don't store user addresses or personal details

### Safety Measures
- **Human-in-the-loop**: Every WhatsApp message requires user approval before sending
- **No auto-payments**: Price is an estimate only; payment happens directly between user and provider
- **Dispute resolution**: AI-mediated but user always has final say
- **Provider verification**: Based on Google Places data (ratings, reviews, business status)

### Content Safety
- **Gemini safety filters**: Active on all AI calls
- **Input sanitization**: All user inputs validated before processing
- **Rate limiting**: Built-in retry with backoff for API protection

---

## ⚠️ Limitations

1. **Free Tier Quotas**: Gemini 2.5 Flash has 20 requests/day on free tier — sufficient for demo but needs paid plan for production
2. **WhatsApp Requires Docker**: WAHA gateway needs Docker Desktop running locally
3. **Provider Phone Availability**: Not all Google Places listings include phone numbers
4. **Price Estimates Are Estimates**: Actual prices may vary based on provider's assessment
5. **No Real Payment System**: Payments are handled offline between user and provider
6. **No Push Notifications**: WhatsApp replies are polled, not pushed (would need Firebase Cloud Messaging in production)
7. **Session-Based Storage**: Bookings/reviews stored in-memory; Firestore integration available but not fully connected for demo
8. **Single Region**: Currently optimized for Pakistan (Lahore area); expandable to other cities

---

## 🎬 Demo

### User Flow
1. Open app → Welcome screen with animations
2. Set up profile (name, location, language, budget preferences)
3. Chat: *"Kal subah 10 bajay AC repair chahiye Gulberg mein"*
4. AI understands → Finds real AC repair providers near Gulberg
5. Shows top 3 ranked providers with scores + reasoning
6. Select provider → See price breakdown (PKR 1,500)
7. Confirm → AI generates WhatsApp message → User approves → Sent
8. Provider replies → AI parses response → Booking confirmed
9. After service → Rate + review → Reputation updated

### Sample Interactions

**Roman Urdu:**
> "mujhay pizza chahiye abhi Johar Town se"
> → Finds Caprinos Pizza, Pizza Hut near Johar Town

**English:**
> "I need a plumber urgently, pipe burst"
> → Detects high urgency, asks for location, fast-tracks search

**Code-switched:**
> "AC repair kal 10 bajay, budget thoda tight hai"
> → Detects budget constraint, adjusts ranking weights

---

## 👥 Team

Built for the **Google Antigravity Hackathon 2026 — Challenge 2** using Google Antigravity as the primary development orchestrator.

---

## 📄 License

This project was built for the Google Antigravity Hackathon 2026. All rights reserved.
