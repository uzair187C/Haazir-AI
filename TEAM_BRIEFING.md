# 🏆 Haazir AI — Team Briefing
## Last Updated: May 18, 2026 — 1:45 PM PKT

---

## What Is Haazir AI?
**Haazir AI** (حاضر — "At Your Service") is an AI-powered mobile app for the Google Antigravity Hackathon (Challenge 2). Users chat naturally in Urdu/English/Roman Urdu to request ANY service (plumber, electrician, food, etc). The AI finds real providers via Google Maps, ranks them, contacts them via WhatsApp, books the service, and collects feedback.

## 📊 What's Been Built (✅ Done)

### Backend (100% Complete)
- **6 AI Agents** powered by Gemini 2.5 Flash:
  1. **Intent Agent** — Understands Urdu/English/Roman Urdu, extracts service type, time, budget, urgency
  2. **Discovery Agent** — Searches Google Places API for real providers within 30km
  3. **Matching Agent** — 8-factor ranking algorithm with AI-generated reasoning
  4. **Pricing Agent** — Dynamic PKR pricing with breakdown (base, travel, urgency, discounts)
  5. **Scheduling Agent** — Parses natural time ("kal subah 10 bajay"), detects conflicts
  6. **Quality Agent** — Handles 6 dispute types, sentiment analysis, reputation scoring
- **API Routes**: chat, providers, bookings, feedback, webhooks, traces
- **Services**: Firebase Firestore ops, Gemini retry helper, agent trace logger (OODA format)
- **WhatsApp**: n8n workflow JSONs ready for import (send + receive)
- **Edge Cases**: No provider fallback, auto-replacement on cancellation, graceful API failure handling

### Mobile App (6 Screens Built)
- Welcome screen (animated gradient orbs)
- Onboarding (3-step: name → location → preferences)
- Chat (WhatsApp-style with provider cards)
- Confirm booking (price breakdown + WhatsApp preview)
- Feedback (star rating + tags + review)
- Root layout (dark theme + slide animations)

### Documentation (100%)
- README.md with architecture, API docs, baseline comparison, cost analysis

## 🔧 What's Being Built NOW

### Phase 1: Google Sign-In + Cloud Storage
- Real Google authentication (not just local storage)
- User data syncs across devices via Firestore
- Every user gets a unique Google-linked ID

### Phase 2: Premium UI Overhaul
- Custom fonts (Inter/Outfit from Google Fonts)
- Glassmorphic provider cards with depth
- Skeleton/shimmer loading states
- Animated chat bubbles
- Professional app icon + splash screen
- Error/empty states with friendly messages

### Phase 3: Backend Deployment
- Deploying to Google Cloud Run (public URL)
- So the APK works on ANY phone, not just emulator

### Phase 4: APK Build
- Standalone Android APK via `eas build`

## ❌ What's NOT Done Yet
- [ ] Google Sign-In screen + auth flow
- [ ] Firestore-based user data persistence
- [ ] UI polish (fonts, animations, loading states)
- [ ] App icon + splash screen
- [ ] Backend deployment to Cloud Run
- [ ] APK build
- [ ] WhatsApp SIM + WAHA setup (can be done last)
- [ ] Demo video (3-5 min)
- [ ] Antigravity usage video (2-3 min)

## 🔑 Key Technical Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| AI Model | Gemini 2.5 Flash | 2.0 had zero quota on our key |
| WhatsApp | WAHA (Docker) + n8n | Free, self-hosted, no API costs |
| Auth | Firebase Google Sign-In | Cross-device sync, free tier |
| Database | Firestore | Real-time, scales, free tier generous |
| App Framework | React Native + Expo | Cross-platform, easy APK builds |
| Deployment | Google Cloud Run | Scales to zero, pay-per-use |

## 🏗️ Architecture (Simple View)
```
Phone App → Backend API (Node.js) → Gemini AI + Google Maps + Firestore
                                  → n8n → WAHA → WhatsApp (Provider)
```

## 📁 Project Structure
```
haazir-app/          ← React Native Expo mobile app (6 screens)
haazir-backend/      ← Node.js Express API (6 agents, 6 route files, 3 services)
  agents/            ← intentAgent, discoveryAgent, matchingAgent, pricingAgent, schedulingAgent, qualityAgent
  routes/            ← chat, providers, bookings, feedback, webhooks, traces
  services/          ← firebase, geminiHelper, traceLogger
  n8n-workflows/     ← send-whatsapp.json, receive-whatsapp.json
```

## ⏰ Deadline: May 20, 2026
## 📋 Submission: APK + Demo Video + Antigravity Video + Agent Traces + README
