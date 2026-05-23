# 🔒 HAAZIR AI — TONIGHT'S LOCK-IN PLAN
## May 18, 2026 | Start: 8:00 PM PKT | Goal: Everything working by midnight

---

## 🎯 MISSION: Get the app 100% functional tonight. UI polish tomorrow.

---

## STEP 1: Google OAuth Client IDs (YOU — 10 min)
**Why:** Without these, Google Sign-In is just a button that does nothing.

### What you need to do:
1. Open: https://console.cloud.google.com/apis/credentials?project=haazir-ai-496420
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Create TWO client IDs:

**Client ID #1 — Web Application:**
- Application type: `Web application`
- Name: `Haazir AI Web`
- Authorized redirect URIs: Add `https://auth.expo.io/@your-expo-username/haazir-app`
- Click Create → **COPY the Client ID** (looks like `491138345859-xxxxx.apps.googleusercontent.com`)

**Client ID #2 — Android:**
- Application type: `Android`
- Name: `Haazir AI Android`
- Package name: `com.haazir.ai` (check your `app.json` for exact value)
- SHA-1: Run this in terminal: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
- Click Create → **COPY the Client ID**

4. **Send me both Client IDs** and I'll wire them into the app instantly.

---

## STEP 2: Wire Google Sign-In (ME — 10 min after you give IDs)
- Replace placeholder client IDs in `login.tsx`
- Wire `expo-auth-session` with real OAuth flow
- Test sign-in → onboarding → chat flow

---

## STEP 3: Wire Chat History to Firestore (ME — 15 min)
- Every message sent/received gets saved to `chat_history/{userId}/messages`
- On app launch, load previous chat history from Firestore
- Already have `saveChatMessage()` and `getChatHistory()` in firebase.ts

---

## STEP 4: Deploy Backend to Cloud Run (YOU + ME — 20 min)

### What you need to do first:
1. Install Google Cloud CLI (if not installed): https://cloud.google.com/sdk/docs/install
2. Run in terminal:
```powershell
gcloud auth login
gcloud config set project haazir-ai-496420
```

### Then I'll give you ONE command to deploy:
```powershell
cd "C:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-backend"
gcloud run deploy haazir-api --source . --region us-central1 --allow-unauthenticated --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_KEY,GOOGLE_API_KEY=YOUR_GOOGLE_MAPS_KEY"
```

This will give us a URL like `https://haazir-api-xxxxx-uc.a.run.app`
I'll then update ALL the app files to use this URL instead of localhost.

---

## STEP 5: WhatsApp Setup (YOU + ME — 15 min)
**When you have the SIM ready:**

### What you do:
1. Make sure Docker Desktop is running
2. Run these in terminal:
```powershell
docker run -d --name waha -p 3000:3000 devlikeapro/waha
docker run -d --name n8n -p 5678:5678 -e WEBHOOK_URL=http://localhost:5678 n8nio/n8n
```
3. Open http://localhost:5678 (n8n dashboard)
4. I'll tell you how to import the workflow JSONs

### What I do:
- Guide you through importing `send-whatsapp.json` and `receive-whatsapp.json`
- Update webhook URLs if needed
- Test end-to-end message flow

---

## STEP 6: Build APK (ME + YOU — 15 min)
**After backend is deployed:**

### What you need:
- Expo account (create at https://expo.dev if you don't have one)
- Run: `npx eas login` and enter your credentials

### Then I run:
```powershell
cd "C:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-app"
npx eas build -p android --profile preview
```
- Takes ~15-20 min on Expo's servers
- Downloads as `.apk` file you can install on any Android phone

---

## UI PLAN (TOMORROW — May 19)
You mentioned getting UI from Stitch or somewhere. Here's the plan:

### Option A: Stitch / UI Kit
- Find a React Native dark theme UI kit
- Extract the design tokens (colors, spacing, typography, shadows)
- I apply them to all 6 screens

### Option B: You send me screenshots of what you want
- Find 2-3 apps that look how you want Haazir to look
- Screenshot them and share
- I replicate that exact style

### Option C: I redesign from scratch based on your feedback
- Tell me: "Make the cards bigger", "More rounded", "Different colors", etc.
- I iterate until you're happy

**Your call — which option do you prefer?**

---

## TIMELINE TONIGHT
```
8:00 PM  — You start getting OAuth Client IDs (Step 1)
8:10 PM  — I wire Google Sign-In (Step 2)
8:25 PM  — I wire chat history to Firestore (Step 3)
8:45 PM  — You install gcloud CLI + login (Step 4 prep)
9:00 PM  — We deploy backend together (Step 4)
9:20 PM  — WhatsApp setup if SIM is ready (Step 5)
9:35 PM  — Build APK (Step 6)
10:00 PM — DONE ✅ Everything functional
```

---

## CHECKLIST — Print this and check off as we go
```
[ ] OAuth Client IDs obtained
[ ] Google Sign-In working
[ ] Chat history saves to Firestore
[ ] gcloud CLI installed and logged in
[ ] Backend deployed to Cloud Run
[ ] App updated with production API URL
[ ] WhatsApp WAHA running (if SIM ready)
[ ] n8n workflows imported (if SIM ready)
[ ] APK built and downloaded
[ ] APK tested on real phone
```

---

## ⚠️ RULES FOR TONIGHT
1. **No UI work** — that's tomorrow. Tonight = functionality only.
2. **No wasting time** — if something is blocked, we skip it and come back.
3. **Test after every step** — don't stack 5 changes and then debug.
4. **Communicate blocks** — if gcloud doesn't install, tell me immediately.

**LET'S GO. Start with Step 1 — get those OAuth Client IDs. 🚀**
