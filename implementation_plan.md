# 🏆 Haazir AI — Complete Battle Plan
## Google Antigravity Hackathon | Challenge 2: AI Service Orchestrator

---

## What We're Building

**Haazir AI** (حاضر — "At Your Service") — A conversational AI agent that handles ANY service request: plumber, electrician, food delivery, carpenter, AC repair — literally anything available on Google Maps. User chats naturally → AI understands → finds best nearby providers → contacts them via WhatsApp → books the service → collects feedback. All-in-one.

---

## How Everything Connects (The Big Picture)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S PHONE (APK)                       │
│  React Native Expo App                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐     │
│  │ Login    │ │ Chat     │ │ Provider │ │ Feedback  │     │
│  │ Screen   │ │ Screen   │ │ Cards    │ │ Screen    │     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘     │
│       └─────────────┴────────────┴─────────────┘           │
│                         │                                   │
│              HTTPS API Calls (fetch/axios)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (Node.js + Express)              │
│              Hosted on: Google Cloud Run                     │
│                                                             │
│  /api/auth/google    → Firebase Auth (verify Google login)  │
│  /api/chat/send      → Receives user message, calls AI     │
│  /api/providers/find → Calls Google Places API              │
│  /api/booking/create → Creates booking in database          │
│  /api/booking/status → Returns booking status               │
│  /api/feedback/submit→ Saves rating + review                │
│  /api/whatsapp/hook  → Receives provider WhatsApp replies   │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  🧠 AI BRAIN (Gemini API via GCP)       │               │
│  │  - Understands Urdu/English/Roman Urdu  │               │
│  │  - Extracts: service, location, time    │               │
│  │  - Ranks providers (8 factors)          │               │
│  │  - Generates price quotes               │               │
│  │  - Writes WhatsApp messages             │               │
│  │  - Handles disputes                     │               │
│  └─────────────────────────────────────────┘               │
└──────────┬────────────────────┬──────────────────┬──────────┘
           │                    │                  │
           ▼                    ▼                  ▼
┌──────────────────┐ ┌─────────────────┐ ┌────────────────────┐
│  Firebase        │ │ Google Maps     │ │  n8n + WAHA        │
│  Firestore DB    │ │ Places API      │ │  (WhatsApp Layer)  │
│                  │ │                 │ │                    │
│  - users         │ │ - Nearby Search │ │  n8n receives      │
│  - bookings      │ │ - Place Details │ │  "send message"    │
│  - providers     │ │ - Phone Numbers │ │  request from      │
│  - reviews       │ │ - Ratings       │ │  backend → sends   │
│  - agent_traces  │ │ - Photos        │ │  via WAHA to       │
│  - chat_history  │ │ - Hours         │ │  WhatsApp.         │
│                  │ │                 │ │                    │
│                  │ │                 │ │  Provider replies → │
│                  │ │                 │ │  WAHA webhook →     │
│                  │ │                 │ │  n8n → backend     │
└──────────────────┘ └─────────────────┘ └────────────────────┘
```

---

## Step-by-Step: What Happens When User Opens the App

### Step 1: Login
```
User opens app → Google Sign-In button → 
  App gets Google token → sends to Backend /api/auth/google →
  Backend verifies with Firebase Auth → creates user in Firestore →
  Returns session token → App stores it → Goes to Chat Screen
```

### Step 2: User Sends a Message
```
User types: "Kal subah 10 bajay AC repair chahiye, budget kam hai"
  App sends to Backend: POST /api/chat/send { message, userId, location }
  
  Backend calls Gemini AI with the message →
  AI extracts:
    service_type: "AC Repair"
    time: "tomorrow 10:00 AM"  
    budget: "low"
    location: user's saved location (e.g. Lahore)
    confidence: 0.92

  If confidence < 0.8 → AI asks clarification question
  If confidence >= 0.8 → proceed to provider search
```

### Step 3: Find Providers
```
Backend calls Google Places API:
  POST https://places.googleapis.com/v1/places:searchNearby
  {
    "includedTypes": ["electrician"],  // or relevant type
    "textQuery": "AC repair technician",
    "locationRestriction": {
      "circle": {
        "center": { lat: user_lat, lng: user_lng },
        "radius": 30000  // 30km
      }
    }
  }

  Returns: list of businesses with name, rating, phone, address, reviews

  Backend stores these in Firestore → runs Matching Algorithm
```

### Step 4: Rank & Recommend
```
AI Matching Agent scores each provider on 8 factors:
  1. Distance from user (closer = better)
  2. Google rating (higher = better)  
  3. Number of reviews (more = more trusted)
  4. Review recency (recent reviews = active business)
  5. Price estimate (fits user budget)
  6. Specialization match (AC expert vs general electrician)
  7. Operating hours (available at requested time)
  8. Phone/WhatsApp availability

  Top 3 providers shown to user as cards in app
  AI explains WHY it chose each one
```

### Step 5: WhatsApp Contact
```
User selects provider → taps "Contact" →
  AI generates WhatsApp message in Urdu/English:
    "AOA, kal subah 10 bajay AC repair ka kaam hai.
     Kya aap available hain?"
  
  Shows to user: "Should I send this? ✅ / ❌"
  User confirms ✅ →
  
  Backend sends to n8n: POST http://n8n-server/webhook/send-whatsapp
    { to: provider_phone, message: "AOA..." }
  
  n8n workflow:
    1. Receives webhook
    2. Calls WAHA API: POST http://waha/api/sendText
       { chatId: "923001234567@c.us", text: "AOA..." }
    3. Message sent from OUR WhatsApp number to provider
    4. App shows: "Message sent! Waiting for reply... ⏳"

  When provider replies:
    1. WAHA receives message
    2. WAHA sends webhook to n8n
    3. n8n forwards to Backend: POST /api/whatsapp/hook
    4. AI processes reply → updates booking status
    5. App shows: "Provider confirmed! 🎉"
```

### Step 6: Booking & Follow-up
```
After confirmation:
  - Booking saved in Firestore with status "confirmed"
  - Reminder scheduled (notification)
  - After service time passes → feedback prompt in app
  - User rates provider → stored in Firestore
  - Provider reputation updated
```

---

## Database Structure (Firestore)

```
📁 users/
  └── {userId}/
      ├── name: "Ahmed"
      ├── email: "ahmed@gmail.com"  
      ├── phone: "+923001234567"
      ├── location: { lat: 31.5204, lng: 74.3587, address: "Gulberg, Lahore" }
      ├── preferredLanguage: "roman_urdu"
      └── createdAt: timestamp

📁 bookings/
  └── {bookingId}/
      ├── userId: "abc123"
      ├── providerName: "Ali AC Services"
      ├── providerPhone: "+923009876543"
      ├── serviceType: "AC Repair"
      ├── scheduledTime: timestamp
      ├── status: "confirmed" | "pending" | "completed" | "cancelled"
      ├── priceEstimate: 2500
      ├── priceBreakdown: { base: 1500, travel: 500, urgency: 500 }
      ├── whatsappMessages: [ { from, text, timestamp } ]
      └── agentTrace: { intent, matching_scores, reasoning }

📁 reviews/
  └── {reviewId}/
      ├── bookingId: "xyz789"
      ├── userId: "abc123"
      ├── providerPhone: "+923009876543"
      ├── rating: 4.5
      ├── comment: "Good work, on time"
      └── createdAt: timestamp

📁 agent_traces/
  └── {traceId}/
      ├── bookingId: "xyz789"
      ├── step: "matching"
      ├── observation: "User needs AC repair, budget sensitive"
      ├── inference: "Provider A better despite being farther"
      ├── decision: "Recommend Provider A (reliability 94%)"
      ├── action: "Showed 3 provider cards"
      └── timestamp: timestamp
```

---

## n8n Workflow — Exactly How It Works

```
┌─────────────────────────────────────────────────┐
│              n8n WORKFLOW #1: SEND MESSAGE       │
│                                                 │
│  [Webhook Trigger] ← Backend calls this         │
│       │                                         │
│       ▼                                         │
│  [Set Variables] phone, message                 │
│       │                                         │
│       ▼                                         │
│  [HTTP Request] → WAHA API                      │
│  POST http://localhost:3000/api/sendText         │
│  { chatId: phone+"@c.us", text: message }       │
│       │                                         │
│       ▼                                         │
│  [Respond to Webhook] → "sent" back to backend  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         n8n WORKFLOW #2: RECEIVE REPLIES         │
│                                                 │
│  [Webhook Trigger] ← WAHA calls when msg rcvd  │
│       │                                         │
│       ▼                                         │
│  [Extract Data] from, text, timestamp           │
│       │                                         │
│       ▼                                         │
│  [HTTP Request] → Our Backend                   │
│  POST backend/api/whatsapp/hook                 │
│  { from: phone, text: reply, timestamp }        │
│       │                                         │
│       ▼                                         │
│  Backend AI processes reply and updates app     │
└─────────────────────────────────────────────────┘
```

**Where n8n + WAHA run:** On the same server (or your local PC for demo). Both are Docker containers. One command starts them.

---

## What We Need to Set Up (In Order)

### Infrastructure (Do First)
| # | What | How | Time |
|---|---|---|---|
| 1 | Google Cloud Project | Go to console.cloud.google.com → New Project | 10 min |
| 2 | Enable APIs | Places API, Gemini API, Cloud Run | 5 min |
| 3 | Firebase Project | console.firebase.google.com → link to GCP project | 10 min |
| 4 | Firebase Auth | Enable Google Sign-In provider | 5 min |
| 5 | Firestore Database | Create in Firebase console | 5 min |
| 6 | Install Docker | For WAHA + n8n | 15 min |
| 7 | Start WAHA | `docker run -p 3000:3000 devlikeapro/waha` | 5 min |
| 8 | Start n8n | `docker run -p 5678:5678 n8nio/n8n` | 5 min |
| 9 | Link WhatsApp | Scan QR code in WAHA dashboard | 5 min |

### Code We Build
| # | What | Tech | Description |
|---|---|---|---|
| 1 | **Backend API** | Node.js + Express | REST API server — all brain logic here |
| 2 | **Mobile App** | React Native + Expo | Beautiful chat UI, login, provider cards |
| 3 | **n8n Workflows** | n8n visual editor | 2 workflows (send + receive WhatsApp) |
| 4 | **AI Prompts** | Gemini API | System prompts for each agent role |

### Final Output
| # | What | Format |
|---|---|---|
| 1 | Working APK | `eas build -p android --profile preview` |
| 2 | Demo video | 3-5 min screen recording of full flow |
| 3 | Antigravity video | 2-3 min showing how we used this tool |
| 4 | Agent traces | JSON logs from Firestore |
| 5 | README.md | Full documentation |

---

## 5-Day Sprint

### Day 1 (Today/Tonight): Foundation
- Set up GCP + Firebase + Expo project
- Build login screen + chat UI (gorgeous design)
- Set up backend with Express
- Connect app to backend (test with simple echo)

### Day 2: AI Brain
- Gemini API integration for intent understanding
- Entity extraction (service, location, time, budget)
- Google Places API integration for provider search
- 8-factor matching algorithm
- Provider cards UI

### Day 3: WhatsApp + Booking
- Docker: WAHA + n8n setup
- n8n workflows (send + receive)
- Backend WhatsApp endpoints
- Booking flow in app
- Price breakdown UI

### Day 4: Polish + Edge Cases
- Feedback/review screen
- Dispute handling flow
- Edge cases (no provider, cancellation, bad input)
- Agent trace logging
- UI animations and polish

### Day 5: Ship It
- Build APK
- Record demo video
- Record Antigravity usage video
- Write README
- Test everything end-to-end
- Submit

---

## Evaluation Strategy (How We Score Maximum)

| Category (Weight) | How We Win |
|---|---|
| **Matching quality (25%)** | 8-factor algorithm with AI reasoning traces explaining every choice |
| **Antigravity integration (20%)** | ALL code built through Antigravity, traces/logs submitted |
| **Multilingual (15%)** | Urdu + Roman Urdu + English + code-switched input with confidence scores |
| **Scheduling/Pricing (15%)** | Dynamic pricing with breakdown, conflict detection, alternatives |
| **Disputes/Reliability (15%)** | No-show handling, cancellation recovery, quality complaints |
| **Innovation/UX (10%)** | Voice input, real WhatsApp, gorgeous UI, all-in-one concept |

---

> [!IMPORTANT]
> **Ready to start building? Once you confirm, I'll immediately:**
> 1. Set up the Expo project structure
> 2. Create the backend boilerplate
> 3. Start building the gorgeous chat UI
> 
> Say "GO" and we begin! 🚀
