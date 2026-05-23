# 🚀 HAAZIR AI — RESTART & EXECUTION GUIDE
## Read this after PC restart. Follow step by step.
## Last saved: May 17, 2026 — 5:24 PM PKT

---

# 📊 CURRENT STATUS: ~85% Complete | Deadline: May 20

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (Node.js) | ✅ 100% | All 6 agents, all routes, fully tested |
| AI Agents (Gemini) | ✅ 100% | Using gemini-2.5-flash, retry logic built |
| Mobile App (Expo) | ✅ 90% | 6 screens done, needs Sign-In + polish |
| Documentation | ✅ 100% | README.md complete |
| WhatsApp Pipeline | 🔶 60% | n8n workflows ready, needs Docker + SIM |
| APK Build | ⬜ 0% | Needs Expo account |
| Demo Videos | ⬜ 0% | Your task after everything works |

---

# 🧑 YOUR TASKS (Do these yourself, in order)

## STEP 1: Install & Start Docker Desktop
1. Install Docker Desktop (you downloaded it already)
2. **Restart PC** (Docker needs it)
3. Open Docker Desktop after restart
4. Wait until it says **"Docker is running"** (green icon in system tray)
5. Open PowerShell and verify:
   ```powershell
   docker --version
   ```
   You should see something like `Docker version 27.x.x`

## STEP 2: Start WAHA (WhatsApp Gateway)
Run in PowerShell:
```powershell
docker run -d --name waha -p 3000:3000 devlikeapro/waha
```
Then open browser: **http://localhost:3000**
- You should see the WAHA dashboard
- Click **"Start Session"** → default session → Start
- **Scan QR code** with your WhatsApp phone (the SIM you got for business)
- ✅ WAHA is connected when status shows "CONNECTED"

## STEP 3: Start n8n (Workflow Automation)
Run in PowerShell:
```powershell
docker run -d --name n8n -p 5678:5678 -e WEBHOOK_URL=http://localhost:5678 n8nio/n8n
```
Then open browser: **http://localhost:5678**
- Create a free local account (just email + password)
- ✅ n8n is running

## STEP 4: Import n8n Workflows
In n8n dashboard:
1. Click **"Add Workflow"** → **"Import from File"**
2. Import: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-backend\n8n-workflows\send-whatsapp.json`
3. **Activate** the workflow (toggle switch on top right)
4. Click **"Add Workflow"** → **"Import from File"** again
5. Import: `c:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-backend\n8n-workflows\receive-whatsapp.json`
6. **Activate** this workflow too
7. ✅ Both workflows active

## STEP 5: Start Backend Server
Open a NEW PowerShell window:
```powershell
cd "c:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-backend"
npm start
```
You should see:
```
🚀 Haazir AI Backend running on http://localhost:3001
📡 Health check: http://localhost:3001/api/health
```

## STEP 6: Test WhatsApp End-to-End
In another PowerShell window, run:
```powershell
$body = '{"to":"923XXXXXXXXX","message":"AOA! Test message from Haazir AI","bookingId":"test_123"}'
Invoke-RestMethod -Uri 'http://localhost:3001/api/webhooks/send-whatsapp' -Method Post -Body $body -ContentType 'application/json'
```
Replace `923XXXXXXXXX` with your WhatsApp SIM number. You should receive a WhatsApp message!

## STEP 7: Create Expo Account & Build APK
```powershell
# Create account at https://expo.dev (free)
# Then login:
cd "c:\Users\muzai\Desktop\Google Antigravity Hackathon\haazir-app"
npx eas login

# Build APK (tell Antigravity to set up eas.json first!)
```

## STEP 8: Get WhatsApp SIM (if not done)
- Buy any cheap prepaid SIM (Jazz/Zong, ~PKR 200)
- Activate WhatsApp on it using a spare phone
- Use this phone to scan WAHA QR code in Step 2

---

# 🤖 ANTIGRAVITY'S REMAINING TASKS (Tell it to do these)

When you open Antigravity after restart, paste this as your first message:

> "I've restarted my PC and Docker is running. Continue with Haazir AI tasks. Here's what's left:
> 1. Set up eas.json for APK build (P1)
> 2. UI polish — animations, loading states, error states (N1-N3)  
> 3. App icon and splash screen (N4)
> 4. Help test WhatsApp end-to-end after I import n8n workflows
> 5. Help build APK
> 
> The AGENT_CONTEXT.md has all the project context."

### What Antigravity will do:
| Task | Priority | Time Est. |
|------|----------|-----------|
| **P1. eas.json config** for APK build | 🔴 High | 5 min |
| **N1. Animations** — smooth screen transitions | 🟡 Medium | 15 min |
| **N2. Loading states** — skeleton screens while AI thinks | 🟡 Medium | 10 min |
| **N3. Error states** — friendly messages when things fail | 🟡 Medium | 10 min |
| **N4. App icon + splash** — generate and configure | 🟡 Medium | 10 min |
| **C1. Google Sign-In** — login screen (nice-to-have) | 🟢 Low | 20 min |
| **C4. Voice input** — microphone button (nice-to-have) | 🟢 Low | 15 min |
| **WhatsApp test** — verify end-to-end after Docker setup | 🔴 High | 5 min |
| **APK build help** — guide through `eas build` | 🔴 High | 10 min |

---

# 📁 KEY FILES REFERENCE

| File | What it is |
|------|-----------|
| `haazir-backend/.env` | All API keys (GEMINI + Google Maps) |
| `haazir-backend/index.js` | Server entry point (port 3001) |
| `haazir-backend/agents/` | All 6 AI agents |
| `haazir-backend/routes/chat.js` | Main orchestration endpoint |
| `haazir-backend/n8n-workflows/` | WhatsApp workflow JSONs for n8n |
| `haazir-app/app/` | All 6 mobile screens |
| `AGENT_CONTEXT.md` | Full context for any Antigravity session |
| `task.md` | Master checklist with progress |
| `README.md` | Submission documentation |

---

# 🔑 API KEYS (Already configured in .env)

| Key | Value | Status |
|-----|-------|--------|
| Google Maps | `YOUR_GOOGLE_MAPS_KEY` | ✅ Working |
| Gemini AI | `YOUR_GEMINI_KEY` | ✅ Working (gemini-2.5-flash) |
| Firebase Project | `haazir-ai-496420` | ✅ Configured |

---

# ⚠️ IMPORTANT NOTES

1. **Model is gemini-2.5-flash** — Do NOT change to gemini-2.0-flash (it has zero quota)
2. **Free tier limit**: 20 Gemini requests/day — retry logic handles 429s automatically
3. **Backend must be running** for the mobile app to work (port 3001)
4. **Docker must be running** for WhatsApp to work (WAHA on port 3000, n8n on port 5678)
5. **All 6 agents are tested and working** — don't modify agent code unless needed
6. **Keep this file** — it's your complete reference for everything

---

# 🏁 FINAL SUBMISSION CHECKLIST (May 19-20)

- [ ] APK file (built via `eas build`)
- [ ] Demo video (3-5 min) showing full user flow
- [ ] Antigravity usage video (2-3 min) showing how you built it
- [ ] Agent traces JSON (from `http://localhost:3001/api/traces/export`)
- [ ] README.md (already complete ✅)
- [ ] Submit via Google Form (link from hackathon email)

---

**🎯 You're 85% done. Docker + WhatsApp + APK build = finish line. Let's go! 🚀**
