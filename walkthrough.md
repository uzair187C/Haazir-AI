# Haazir AI — Developer Walkthrough

A comprehensive technical guide explaining how every part of the Haazir AI application is structured and how data flows through the system.

---

## 1. Application Architecture Overview

Haazir AI is split into two independent services that communicate over HTTP:

```
┌─────────────────────────────────────────────┐
│          haazir-app (React Native)           │
│  index → login → onboarding → chat          │
│       → confirm → progress → feedback       │
└──────────────────┬──────────────────────────┘
                   │ HTTPS REST API calls
                   ▼
┌─────────────────────────────────────────────┐
│       haazir-backend (Express.js API)        │
│   6-Agent Gemini 2.5 Flash Orchestrator     │
│   Google Places API · Meta WhatsApp API     │
│   Firebase Admin · In-Memory Booking Store  │
└─────────────────────────────────────────────┘
```

The frontend is a **stateless presentation layer** — it holds UI state and user session data but delegates all AI processing to the backend.

---

## 2. Frontend Architecture (`haazir-app/`)

### 2.1 Entry Point & Layout (`app/_layout.tsx`)
This is the root of the Expo Router tree. It wraps the entire application in:
- **`ErrorBoundary`**: A React class component that catches uncaught render errors and shows a friendly error screen instead of a white crash screen.
- **`AuthProvider`**: The global authentication context that provides `user`, `profile`, `setProfile`, and `logout` to every screen.
- **`Stack` Navigator**: Expo Router's file-based stack navigation with `headerShown: false` (all screens use custom headers) and `fade_from_bottom` transition animation.

### 2.2 Authentication Context (`contexts/AuthContext.tsx`)
This is the brain of the frontend state management. It:
- Persists the user profile in `AsyncStorage` under the key `haazir_user_profile`
- Exposes `user` (from Google OAuth) and `profile` (the extended app profile: name, phone, address, preferences)
- The `setProfile()` function both updates the React state AND writes to AsyncStorage for persistence across app restarts
- `logout()` clears both state and storage

### 2.3 Screen Flow

```
index.tsx (Welcome)
    │ Press "Get Started"
    ▼
login.tsx (Authentication)
    │ Google OAuth OR Manual Username/Password
    ▼
onboarding.tsx (3-step profile setup)
    │ Name → Location → Preferences
    ▼
chat.tsx (Main Chat — core experience)
    │ User books a provider
    ▼
confirm.tsx (Secure Checkout)
    │ User confirms address + phone sharing
    ▼
progress.tsx (Live Booking Tracker)
    │ Service completed
    ▼
feedback.tsx (Post-service Rating)
```

### 2.4 Chat Screen — The Core Experience (`app/chat.tsx`)

This is the most important screen. Here is the exact data flow for a single message:

1. **User types** a message (e.g., `"mujhe plumber chahiye gulberg mein"`)
2. The `sendMessage()` function fires a `POST /api/chat/send` request with:
   - The message text
   - The user's profile (name, address, search radius, language preference, budget)
   - The user's GPS coordinates (currently hardcoded to Lahore `31.5204, 74.3587`)
3. While waiting, the `Shimmer` component animates three loading bars to show "Haazir AI is analyzing matches..."
4. The API response returns `{ reply, providers, type }`
5. If `providers` array is present, the `ProviderCard` component renders each provider as an interactive booking card with ranking badge, ratings, distance, AI reasoning summary, and a "Book Provider" button
6. Pressing "Book Provider" navigates to `confirm.tsx` with the provider data serialized as a route parameter

### 2.5 Confirm Screen — Security Gate (`app/confirm.tsx`)

A key design decision: before dispatching any WhatsApp message, the user **must explicitly check two permission boxes**:
1. Confirm the service location address
2. Authorize sharing their phone number with the provider

This is enforced in code — the "Dispatch Secure Booking" button is disabled until both are checked. This is both a legal safeguard and a hackathon judging criterion demonstrating responsible AI.

The confirm flow:
1. On mount, creates a booking record via `POST /api/bookings/create`
2. Fetches a pre-generated WhatsApp message from `POST /api/bookings/:id/generate-message`
3. Displays the message preview so the user can see exactly what will be sent
4. On dispatch, calls `POST /api/webhooks/send-whatsapp`

---

## 3. Backend Architecture (`haazir-backend/`)

### 3.1 Server Entry Point (`index.js`)
A standard Express server that:
- Enables CORS for all origins (so the Expo app can call it from any IP)
- Mounts all route modules under `/api/` prefixes
- Exposes a health check at `/api/health` that returns agent list and active trace summary

### 3.2 The 6-Agent Orchestrator (`routes/chat.js`)

When `POST /api/chat/send` is called, it runs this pipeline sequentially:

**Step 1 — Intent Agent** (`agents/intentAgent.js`)
- Sends the raw user message to Gemini 2.5 Flash with a structured prompt
- Extracts: `service_type`, `urgency` (ASAP/scheduled), `location`, `budget_signal`, `language`, `sentiment`
- Returns a clean JSON object used by all downstream agents

**Step 2 — Discovery Agent** (`agents/discoveryAgent.js`)
- Maps the `service_type` to a Google Places search query (e.g., "plumber" → `textQuery: "plumber near Gulberg III, Lahore"`)
- Calls the Google Places API (New) Text Search endpoint
- Returns up to 10 real provider objects with names, addresses, phone numbers, ratings, and coordinates
- Computes haversine distance for each provider from the user's location

**Step 3 — Matching Agent** (`agents/matchingAgent.js`)
- Sends all discovered providers to Gemini 2.5 Flash with the full intent context
- Gemini assigns a `matchScore` (0-100) to each provider based on rating, distance, reviews, and urgency
- Returns the providers sorted by match score with a top 3 recommendation

**Step 4 — Pricing Agent** (`agents/pricingAgent.js`)
- Generates a realistic PKR price estimate for the specific service
- Returns `{ total, currency, breakdown: { base_fee, travel_charge, urgency_surcharge, discount }, confidence }`

**Step 5 — Scheduling Agent** (`agents/schedulingAgent.js`)
- Suggests the best available time slots (ASAP / Morning / Afternoon / Evening)
- Considers the urgency flag from the intent agent

**Step 6 — Quality Agent** (`agents/qualityAgent.js`)
- Analyzes the top provider's recent Google reviews
- Uses Gemini to generate a 1-2 sentence `aiReasoning` summary explaining WHY this provider was chosen
- This text appears on the Provider Card in the chat UI

### 3.3 Booking Store (`services/bookingStore.js`)
An in-memory JavaScript `Map` that stores active bookings by ID. This is intentionally simple for the hackathon — in production this would be replaced with Firestore or PostgreSQL.

Key functions:
- `createBooking(data)` — generates a UUID, stores booking
- `getBookingById(id)` — retrieves booking
- `getBookingByProviderPhone(phone)` — used by the webhook to match incoming WhatsApp replies to active bookings
- `updateBooking(id, updates)` — updates status, adds log entries
- `addProgressLog(id, type, message)` — appends to the timeline array

### 3.4 WhatsApp Webhook Handler (`routes/webhooks.js`)

**Outgoing** (`POST /api/webhooks/send-whatsapp`):
- Formats the phone number to international format (e.g., `0300...` → `92300...`)
- If `TEST_PROVIDER_PHONE` is set in `.env`, intercepts the message and routes it there instead (hackathon demo mode)
- Calls `POST https://graph.facebook.com/v20.0/{PHONE_ID}/messages` with the Bearer token

**Incoming** (`POST /api/webhooks/whatsapp-incoming`):
- Meta calls this endpoint whenever the provider replies on WhatsApp
- The handler looks up the booking by the sender's phone number
- Sends the reply text to Gemini to analyze: did they confirm, reject, or ask a question?
- Updates the booking status accordingly
- If confirmed: auto-sends a confirmation message back to the provider
- If rejected: automatically triggers a replacement provider search using the Discovery + Matching agents
- If a question: stores `pendingUserQuestion` so the progress screen can show it to the user

### 3.5 Trace Logger (`services/traceLogger.js`)
Each agent call logs an observation to a central in-memory trace store with the format:
```json
{
  "agent": "MatchingAgent",
  "bookingId": "abc-123",
  "observation": "Found 8 providers for plumber",
  "inference": "Top match: Ali Plumbing (4.8★, 0.8km)",
  "decision": "Return top 3 ranked results",
  "action": "Dispatched ranked list to frontend",
  "timestamp": "2026-05-21T..."
}
```
This is the "Antigravity" agent observability layer — it makes the AI reasoning transparent and inspectable via `GET /api/traces`.

---

## 4. Design System

The entire app uses a unified dark-mode "Nebula Glassmorphism" design language:

| Token | Value | Usage |
|---|---|---|
| Background | `#020617` (Slate 950) | All screen backgrounds |
| Glass Panel | `rgba(30, 41, 59, 0.4)` | Cards, modals |
| Deep Glass | `rgba(15, 23, 42, 0.6)` | Inputs |
| Primary Gradient | `#4F46E5` → `#3B82F6` | Buttons, badges, accents |
| Secondary Gradient | `#3B82F6` → `#0EA5E9` | Avatars, icons |
| Primary Text | `#F8FAFC` | Headings |
| Secondary Text | `#94A3B8` | Subtext, descriptions |
| Muted Text | `#64748B` | Labels, timestamps |
| Success | `#10B981` | Confirmed status |
| Warning | `#F59E0B` | Provider question alerts |
| Danger | `#EF4444` | Errors, cancel actions |

---

## 5. Known Limitations & Future Work

| Area | Current State | Future Improvement |
|---|---|---|
| Booking Persistence | In-memory (resets on server restart) | Migrate to Firestore / PostgreSQL |
| User Location | Hardcoded to Lahore coordinates | Implement `expo-location` for real GPS |
| Provider Phone Numbers | From Google Places (often missing) | Partner with a verified provider directory |
| WhatsApp | Meta Dev Mode (5 test numbers only) | Apply for Meta Business Verification |
| Auth | Google OAuth via Expo Proxy | Implement Firebase Auth for production |
| Scalability | Single Express process | Migrate agents to Google Cloud Functions |
