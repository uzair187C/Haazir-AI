const express = require('express');
const router = express.Router();
const axios = require('axios');
const { callGemini } = require('../services/geminiHelper');
const { logTrace } = require('../services/traceLogger');
const { getBookingByProviderPhone, updateBooking, addProgressLog } = require('../services/bookingStore');

// GET /api/webhooks/whatsapp-incoming — Required by Meta for Webhook Verification
router.get('/whatsapp-incoming', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'haazir_ai_hackathon_2026';
  
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

// POST /api/webhooks/whatsapp-incoming — Official Meta Webhook endpoint for incoming messages
router.post('/whatsapp-incoming', async (req, res) => {
  try {
    const body = req.body;

    // Acknowledge receipt to Meta immediately
    res.sendStatus(200);

    // Check if this is a WhatsApp API event
    if (!body.object || body.object !== 'whatsapp_business_account') return;

    // Parse Meta's nested JSON structure
    const entry = body.entry && body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const messages = value && value.messages;

    if (!messages || !messages[0]) {
      // It might be a status update (delivered/read), which we can ignore for now
      return;
    }

    const message = messages[0];
    // Phone numbers from Meta come with the country code (e.g., 923001234567)
    let from = message.from; 
    
    // Normalize the 'from' number to match the format we use in our database (e.g., +92 or 03...)
    // This is crucial for correctly identifying the booking.
    if (!from.startsWith('+')) from = '+' + from;

    const text = message.text && message.text.body;
    const timestamp = message.timestamp;

    if (!text) return; // We only process text messages right now

    console.log(`[WhatsApp Incoming] From: ${from} | Message: "${text}"`);

    // Match the incoming number to an active booking
    const booking = getBookingByProviderPhone(from);

    if (!booking) {
      // Try matching without the '+' if the DB stores it differently
      const fallbackBooking = getBookingByProviderPhone(from.replace('+', ''));
      if (!fallbackBooking) {
        console.log(`[WhatsApp] No active booking for number: ${from}`);
        return;
      }
    }

    const matchedBooking = booking || getBookingByProviderPhone(from.replace('+', ''));

    // Use AI to parse the provider's reply
    let parsedReply;
    try {
      parsedReply = await callGemini(
        `A service provider replied to a booking request via WhatsApp. Parse their response.

Provider: ${matchedBooking.provider?.name}
Service: ${matchedBooking.serviceType}
Original request time: ${matchedBooking.scheduledTime}

Provider's reply: "${text}"

Determine:
1. Did they accept/confirm, reject/decline, or ask a question?
2. Did they mention a different time or price?
3. What's the sentiment?

Respond in JSON:
{
  "status": "confirmed|rejected|question|unclear",
  "mentioned_price": null or number,
  "mentioned_time": null or "time string",
  "sentiment": "positive|neutral|negative",
  "summary": "brief summary of their response",
  "suggested_action": "update_booking|notify_user|find_replacement|ask_clarification",
  "question_for_user": null or "what to ask the user if provider asked a question"
}`,
        { temperature: 0.1 }
      );
    } catch (e) {
      parsedReply = {
        status: 'unclear',
        sentiment: 'neutral',
        summary: text,
        suggested_action: 'notify_user',
        question_for_user: null
      };
    }

    logTrace('WebhookAgent', matchedBooking.id, {
      observation: `Provider ${matchedBooking.provider?.name} replied: "${text}"`,
      inference: `Status: ${parsedReply.status}, sentiment: ${parsedReply.sentiment}`,
      decision: parsedReply.suggested_action,
      action: `Updating booking ${matchedBooking.id}`,
    });

    // Store the incoming message
    if (!matchedBooking.whatsappMessages) matchedBooking.whatsappMessages = [];
    matchedBooking.whatsappMessages.push({
      direction: 'incoming',
      from,
      text,
      parsed: parsedReply,
      timestamp: new Date(timestamp * 1000).toISOString(),
    });

    addProgressLog(matchedBooking.id, 'provider_replied', `${matchedBooking.provider?.name} replied: "${parsedReply.summary}"`);

    // --- Handle based on provider's response ---
    if (parsedReply.status === 'confirmed') {
      // PROVIDER CONFIRMED
      updateBooking(matchedBooking.id, { status: 'confirmed', providerConfirmedAt: new Date().toISOString() });
      addProgressLog(matchedBooking.id, 'confirmed', `Provider confirmed! ${parsedReply.mentioned_time ? 'Time: ' + parsedReply.mentioned_time : ''}`);

      // Auto-send confirmation details to provider
      let confirmMsg = `Shukriya! Booking confirmed. Customer apki service ka intezaar kar raha hai. Details jald share honge. - Haazir AI`;
      try {
        const genResult = await callGemini(
          `Generate a short WhatsApp confirmation message in Roman Urdu to send to the provider "${matchedBooking.provider?.name}". Service: ${matchedBooking.serviceType}, Time: ${matchedBooking.scheduledTime}. Thank them for confirming, tell them customer details will be shared soon. 1-2 lines only. Return ONLY the message text.`,
          { jsonMode: false, temperature: 0.3 }
        );
        confirmMsg = genResult.trim ? genResult.trim() : genResult;
      } catch (e) {}

      // Send confirmation back to provider via Meta API
      try {
        await axios.post(`http://localhost:${process.env.PORT || 3001}/api/webhooks/send-whatsapp`, {
          to: from,
          message: confirmMsg,
          bookingId: matchedBooking.id
        });
      } catch (e) {
        console.log(`[WhatsApp] Internal call to send-whatsapp failed:`, e.message);
      }

      matchedBooking.whatsappMessages.push({
        direction: 'outgoing', to: from, text: confirmMsg,
        type: 'auto_confirmation', timestamp: new Date().toISOString(),
      });

    } else if (parsedReply.status === 'rejected') {
      // PROVIDER REJECTED — auto-find replacement
      updateBooking(matchedBooking.id, { status: 'provider_declined' });
      addProgressLog(matchedBooking.id, 'provider_declined', `${matchedBooking.provider?.name} declined the booking`);

      // Trigger replacement search
      try {
        const { findProviders } = require('../agents/discoveryAgent');
        const { rankProviders } = require('../agents/matchingAgent');
        const location = matchedBooking.location || { lat: 31.5204, lng: 74.3587, address: 'Lahore' };
        const providers = await findProviders(matchedBooking.serviceType, location);
        const filtered = providers.filter(p => p.name !== matchedBooking.provider.name);
        if (filtered.length > 0) {
          const ranked = await rankProviders(filtered, { service_type: matchedBooking.serviceType, urgency: 'high' });
          updateBooking(matchedBooking.id, {
            replacementProvider: ranked[0],
            replacementAlternatives: ranked.slice(1),
          });
          addProgressLog(matchedBooking.id, 'replacement_found', `Auto-found replacement: ${ranked[0]?.name} (${ranked[0]?.rating}★)`);
        }
      } catch (e) {
        console.error('[WhatsApp] Replacement search failed:', e.message);
      }

    } else if (parsedReply.status === 'question') {
      // PROVIDER ASKED A QUESTION — flag it for the user
      updateBooking(matchedBooking.id, {
        status: 'provider_replied',
        pendingUserQuestion: parsedReply.question_for_user || parsedReply.summary || text,
      });
      addProgressLog(matchedBooking.id, 'provider_question', `Provider asked: "${parsedReply.question_for_user || text}"`);

    } else {
      // UNCLEAR — just update status
      updateBooking(matchedBooking.id, { status: 'provider_replied' });
    }

  } catch (error) {
    console.error('[Webhook] Error processing incoming WhatsApp:', error.message);
    if (!res.headersSent) res.sendStatus(500);
  }
});

// POST /api/webhooks/send-whatsapp — Official Meta Graph API Outgoing Message
router.post('/send-whatsapp', async (req, res) => {
  try {
    let { to, message, bookingId } = req.body;
    
    // --- HACKATHON DEMO OVERRIDE ---
    // Instead of texting the random real plumber, route it to your verified test phone!
    if (process.env.TEST_PROVIDER_PHONE) {
      console.log(`[Demo Override] Rerouting message from ${to} to ${process.env.TEST_PROVIDER_PHONE}`);
      to = process.env.TEST_PROVIDER_PHONE;
    }
    
    // Clean up phone number for Meta API (remove '+', remove leading '0' if local)
    // Meta requires international format without the '+'
    to = to.replace('+', '');
    if (to.startsWith('0')) {
      // Assuming Pakistan for the hackathon
      to = '92' + to.substring(1);
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Update booking status
    if (bookingId) {
      updateBooking(bookingId, { status: 'message_sent' });
      addProgressLog(bookingId, 'message_sent', `WhatsApp message sent to provider`);
    }

    if (!token || !phoneId) {
      console.log(`[WhatsApp API] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID in .env! Simulation mode fallback.`);
      console.log(`[WhatsApp API] Message to ${to}: "${message}"`);
      return res.json({ sent: true, simulated: true, to, message, note: 'Simulation Mode - Missing API Keys' });
    }

    // Call official Meta Graph API
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }
    });

    console.log(`[WhatsApp API] Message successfully delivered to ${to}`);
    
    if (bookingId) {
      logTrace('WhatsAppAgent', bookingId, {
        observation: `Sending WhatsApp to ${to}`,
        inference: 'Meta Graph API available',
        decision: 'Send via official API',
        action: `Message delivered to ${to}`,
      });
    }

    res.json({ sent: true, to, message });

  } catch (error) {
    console.error('[WhatsApp API] Error sending message:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send WhatsApp message via Meta API', details: error.response?.data });
  }
});

module.exports = router;
