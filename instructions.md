# Haazir AI — Setup & Run Instructions

This guide will get you from zero to a fully running local development environment for **Haazir AI**.

---

## Prerequisites

Make sure you have these tools installed before starting:

| Tool | Version | Install |
|---|---|---|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | Included with Node.js |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Git | Any | https://git-scm.com |
| Google Cloud SDK | Latest | https://cloud.google.com/sdk |

---

## Part 1: Backend Setup

### 1. Navigate to the backend directory
```bash
cd "Google Antigravity Hackathon/haazir-backend"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in `haazir-backend/` with the following keys:
```env
PORT=3001
GOOGLE_API_KEY=your_google_places_api_key
GEMINI_API_KEY=your_gemini_api_key
WHATSAPP_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_number_id
WHATSAPP_VERIFY_TOKEN=haazir_ai_hackathon_2026
TEST_PROVIDER_PHONE=+92XXXXXXXXXX
```

> **Where to get these keys:**
> - `GOOGLE_API_KEY`: [Google Cloud Console](https://console.cloud.google.com) → Enable "Places API (New)"
> - `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/app/apikey)
> - `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`: [Meta for Developers](https://developers.facebook.com) → Your WhatsApp App → API Setup

### 4. Start the backend server
```bash
npm start
```
The server starts at `http://localhost:3001`.

### 5. Verify the backend is running
Open your browser and visit:
```
http://localhost:3001/api/health
```
You should see a JSON response with `"status": "ok"` and the list of 6 AI agents.

---

## Part 2: Cloudflare Tunnel (for WhatsApp Webhooks)

The Meta WhatsApp API requires a **public HTTPS URL** to send incoming messages to your local server. Run this in a separate terminal:

```bash
npx -y cloudflared tunnel --url http://localhost:3001
```

Copy the generated URL (e.g., `https://xxxx.trycloudflare.com`) and use it as your Meta Webhook Callback URL + `/api/webhooks/whatsapp-incoming`.

> **Note:** For production, use the deployed Cloud Run URL instead.

---

## Part 3: Mobile App Setup

### 1. Navigate to the app directory
```bash
cd "Google Antigravity Hackathon/haazir-app"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install all native Expo packages
```bash
npx expo install
```

### 4. Start the Expo development server
```bash
npx expo start
```

### 5. Run on your device
- **Physical Android device:** Install the [Expo Go](https://expo.dev/go) app, then scan the QR code shown in the terminal.
- **Android Emulator:** Press `a` in the terminal after starting the Expo server.
- **Web browser (for quick testing):** Press `w` in the terminal.

---

## Part 4: Running on a Physical Device (Full Experience)

For the full WhatsApp pipeline to work end-to-end:

1. Make sure the backend is running (`npm start` in `haazir-backend/`)
2. Make sure Cloudflare Tunnel is running (or Cloud Run is deployed)
3. Open Expo Go on your Android phone and scan the QR code
4. Complete the login and onboarding flow
5. Type a service request in the chat (e.g., `"Mujhe plumber chahiye Gulberg mein"`)
6. The AI will find providers and allow you to book via WhatsApp

---

## Part 5: Build a Production APK (for distribution)

### 1. Login to your Expo account
```bash
eas login
```

### 2. Build the APK
```bash
cd haazir-app
eas build --platform android --profile preview
```

The APK download link will appear in your terminal and at [expo.dev](https://expo.dev).

---

## Part 6: Deploy Backend to Cloud Run (Production)

Either double-click **`1_DEPLOY_BACKEND.bat`** from the root folder, or run:

```bash
cd haazir-backend
gcloud run deploy haazir-api --source . --region us-central1 --allow-unauthenticated
```

---

## Testing the API Directly

You can test the AI pipeline without the app using `curl` or Postman:

```bash
# Test the full AI orchestration
curl -X POST http://localhost:3001/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "mujhe electrician chahiye",
    "userId": "test_user",
    "userProfile": { "name": "Test", "address": "Gulberg III, Lahore" },
    "location": { "lat": 31.5204, "lng": 74.3587, "address": "Gulberg III, Lahore", "radius": 10000 }
  }'
```

```bash
# Test WhatsApp sending
curl -X POST http://localhost:3001/api/webhooks/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{ "to": "+923001234567", "message": "Test from Haazir AI" }'
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `expo-blur` module not found | Run `npx expo install expo-blur` in `haazir-app/` |
| `429 Too Many Requests` from Gemini | Your API key may have hit its free-tier limit. Wait or use a different key. |
| WhatsApp message not delivered | Ensure the recipient number is verified in your Meta Developer Dashboard |
| Google OAuth blocked | Add `https://auth.expo.io/@YOUR_USERNAME/haazir-ai` as Authorized Redirect URI in Google Cloud Console |
| Backend not reachable from app | Make sure Cloud Run is deployed OR the local server + Cloudflare tunnel are both running |
