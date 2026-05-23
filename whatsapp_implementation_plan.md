# 🚀 WhatsApp Business Setup (The Easy Hackathon Way)
**Haazir AI Backend Pipeline**

Meta's official documentation is long and complex. You don't need 90% of it for this hackathon. Because we have already written all the backend code for you, you just need to click a few buttons to get your API keys and connect the Webhook. 

Follow this ultra-simplified, foolproof guide:

---

## Step 1: Create the App & Get Your Phone ID
*First, we need to get your dedicated WhatsApp Phone Number ID.*

1. Go to your **[Meta for Developers Dashboard](https://developers.facebook.com/)**.
2. Click **Create App** (top right).
3. Select **Connect with customers through WhatsApp** and click **Next**.
4. Give it a name (e.g., `Haazir AI`) and select your Business Portfolio. Click **Create app**.
5. Once created, look at the left sidebar menu and click **API Setup** (under WhatsApp).
6. Look for **Phone number ID** (It's a long number like `123456789...`).
   👉 **Copy it and paste it into your `haazir-backend/.env` file as `WHATSAPP_PHONE_ID`.**

---

## Step 2: Get Your Permanent Access Token
*Meta gives you a temporary token that expires in 24 hours. Let's get a permanent one so your app doesn't break during the demo.*

1. Go to **[Business Settings](https://business.facebook.com/settings/)**.
2. On the left sidebar, under **Users**, click **System users**.
3. Click the **Add+** button and create a new system user (Name: `Haazir System`).
4. Select your new user and click **Assign Assets**.
   - **Apps:** Select `Haazir AI` -> Turn on **Full control**.
   - **WhatsApp Accounts:** Select your account -> Turn on **Full control**.
   - Click **Save Changes**.
5. Now, click **Generate token** for that system user.
6. Check these 3 permission boxes:
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
7. Click Generate.
   👉 **Copy the long Token and paste it into your `haazir-backend/.env` file as `WHATSAPP_TOKEN`.**

*(Your `.env` file should now have the Token, Phone ID, and `WHATSAPP_VERIFY_TOKEN=haazir_ai_hackathon_2026`)*

---

## Step 3: Connect the Webhook (Receiving Replies)
*Now we tell Meta to send all incoming messages to your Node.js backend.*

1. Make sure your `haazir-backend` is running (`npm start`) and is online using Ngrok or Cloud Run.
2. Go back to your **Meta App Dashboard**.
3. On the left sidebar, click **Configuration** (under WhatsApp).
4. Under the Webhook section, click **Edit**.
5. **Callback URL:** Enter your public backend URL + `/api/webhooks/whatsapp-incoming`
   *(Example: `https://abcd-123.ngrok.app/api/webhooks/whatsapp-incoming`)*
6. **Verify Token:** Type exactly: `haazir_ai_hackathon_2026`
7. Click **Verify and Save**. (Our code will instantly verify it automatically!)

---

## Step 4: Subscribe to Messages
*Final step! We just have to tell the Webhook to listen for messages.*

1. Stay on the **Configuration** page.
2. Click the **Manage** button under "Webhook fields".
3. Find the row named **`messages`** and click the **Subscribe** checkbox next to it.
4. Click **Done**.

---

## 🎉 That's It! You're Live!

You have completely bypassed the complex Meta setup. The Haazir AI backend is now officially connected to the WhatsApp Cloud API.

**Test it:**
Send a text like *"Hello"* from your personal phone to your new WhatsApp Business number. You will instantly see the log appear in your backend terminal, and our AI Agents will take over!
