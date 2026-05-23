const express = require('express');
const router = express.Router();
const { parseIntent } = require('../agents/intentAgent');
const { findProviders } = require('../agents/discoveryAgent');
const { rankProviders } = require('../agents/matchingAgent');
const { estimatePrice } = require('../agents/pricingAgent');
const { resolveScheduling } = require('../agents/schedulingAgent');
const { logTrace } = require('../services/traceLogger');

// In-memory session store
const sessions = {};

// POST /api/chat/send — Main chat endpoint (full orchestration)
router.post('/send', async (req, res) => {
  try {
    const { message, userId, location } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Get or create session
    if (!sessions[userId]) {
      sessions[userId] = { history: [], currentBooking: null, step: 'chat', lastProviders: null, lastIntent: null };
    }
    const session = sessions[userId];
    const userProfile = req.body.userProfile || {};

    console.log(`\n[Chat] User "${userId}" says: "${message}"`);

    session.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    // --- CHECK: Is this a follow-up to previous results? ---
    if (session.lastProviders && session.lastProviders.length > 0) {
      const followUpKeywords = ['tell me more', 'which one', 'cheapest', 'nearest', 'best', 'compare', 'details', 'number', '#1', '#2', '#3', 'pehla', 'doosra', 'teesra', 'konsa', 'kaunsa', 'price', 'rate', 'available', 'open', 'review', 'rating', 'thanks', 'shukriya', 'ok', 'theek'];
      const isFollowUp = followUpKeywords.some(k => message.toLowerCase().includes(k)) || message.length < 30;

      if (isFollowUp) {
        try {
          const { callGemini } = require('../services/geminiHelper');
          const providerSummary = session.lastProviders.slice(0, 3).map((p, i) =>
            `#${i+1} ${p.name} — Rating: ${p.rating}★, Distance: ${p.distanceKm}km, Reviews: ${p.reviewCount}, Price: PKR ${p.priceEstimate?.total || 'N/A'}, Phone: ${p.phone || 'N/A'}`
          ).join('\n');

          const followUpReply = await callGemini(
            `You are Haazir AI assistant. The user previously searched for "${session.lastIntent?.entities?.service_type}" and was shown these providers:\n${providerSummary}\n\nNow the user says: "${message}"\n\nIf this is a follow-up question about the providers (comparison, details, recommendation), answer it helpfully. If the user seems to want a NEW different service, reply with exactly: "NEW_SEARCH"\n\nKeep your answer concise (2-4 lines). Be friendly, use the same language the user used.`,
            { jsonMode: false, temperature: 0.3 }
          );

          if (followUpReply && !followUpReply.includes('NEW_SEARCH')) {
            const reply = typeof followUpReply === 'string' ? followUpReply.trim() : String(followUpReply).trim();
            session.history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
            return res.json({ type: 'follow_up', reply, providers: session.lastProviders });
          }
          // If NEW_SEARCH, fall through to normal flow
        } catch (e) {
          console.log('[Chat] Follow-up AI failed, proceeding with normal flow');
        }
      }
    }
    // --- STEP 1: Parse intent ---
    const intent = await parseIntent(message, userProfile);

    logTrace('IntentAgent', null, {
      observation: `User said: "${message}"`,
      inference: `Detected service: ${intent.entities?.service_type}, confidence: ${intent.confidence}`,
      decision: intent.clarification_needed ? 'Ask clarification' : 'Proceed to search',
      action: intent.clarification_needed ? 'Sending clarification question' : 'Searching providers',
      confidence: intent.confidence,
      metadata: { entities: intent.entities }
    });

    // --- STEP 2: Handle clarification ---
    if (intent.clarification_needed || intent.confidence < 0.7) {
      const reply = intent.clarification_question || "Could you tell me more about what you need?";
      session.history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });

      return res.json({
        type: 'clarification',
        reply,
        intent,
        agentTrace: { agent: 'IntentAgent', ...intent.agent_trace }
      });
    }

    // --- STEP 3: Find providers ---
    const userLocation = location || {
      lat: userProfile.lat || 31.5204,
      lng: userProfile.lng || 74.3587,
      address: userProfile.address || 'Lahore'
    };
    const searchRadius = location?.radius || userProfile?.searchRadius || 30000;

    const providers = await findProviders(intent.entities.service_type, userLocation, searchRadius);

    logTrace('DiscoveryAgent', null, {
      observation: `Searching for "${intent.entities.service_type}" near ${userLocation.address}`,
      inference: `Found ${providers.length} providers within 30km`,
      decision: providers.length > 0 ? 'Proceed to ranking' : 'No providers — suggest alternatives',
      action: providers.length > 0 ? 'Passing to MatchingAgent' : 'Returning no-provider message',
    });

    // --- EDGE CASE: No providers found ---
    if (providers.length === 0) {
      const noProviderReply = `I searched for ${intent.entities.service_type} providers near you but couldn't find any right now. Here's what I can do:\n\n1️⃣ Search with a wider radius (50km)\n2️⃣ Try a different search term\n3️⃣ Search for a related service\n\nWhat would you prefer?`;

      logTrace('DiscoveryAgent', null, {
        observation: 'Zero providers returned from Places API',
        inference: 'Service may not exist in area or search term too specific',
        decision: 'Offer alternatives to user',
        action: 'Showing 3 options: wider search, different term, related service',
      });

      session.history.push({ role: 'assistant', content: noProviderReply, timestamp: new Date().toISOString() });
      return res.json({ type: 'no_providers', reply: noProviderReply, intent });
    }

    // --- STEP 4: Rank providers ---
    const ranked = await rankProviders(providers, {
      service_type: intent.entities.service_type,
      budget: intent.entities.budget,
      urgency: intent.entities.urgency,
      time: intent.entities.time_parsed,
    }, userProfile);

    ranked.forEach((p, i) => {
      logTrace('MatchingAgent', null, {
        observation: `Provider ${p.name}: rating=${p.rating}, distance=${p.distanceKm}km, reviews=${p.reviewCount}`,
        inference: `Match score: ${p.matchScore} based on 8 factors`,
        decision: `Ranked #${i + 1}`,
        action: 'Showing to user with reasoning',
        reasoning: p.aiReasoning,
        metadata: { scores: p.scores, weights: p.weights }
      });
    });

    // --- STEP 5: Estimate pricing for top provider ---
    let priceEstimate = null;
    try {
      priceEstimate = await estimatePrice(intent.entities.service_type, ranked[0], {
        urgency: intent.entities.urgency,
        budget: intent.entities.budget,
        time: intent.entities.time_parsed,
      });

      logTrace('PricingAgent', null, {
        observation: `Estimating price for ${intent.entities.service_type} from ${ranked[0].name}`,
        inference: `Base market rate calculated with adjustments`,
        decision: `Estimated PKR ${priceEstimate.total} (${priceEstimate.confidence} confidence)`,
        action: 'Attaching price to provider card',
      });

      // Attach price to top provider
      ranked[0].priceEstimate = priceEstimate;
    } catch (e) {
      console.error('[Pricing] Error:', e.message);
    }

    // --- STEP 6: Check scheduling ---
    if (intent.entities.time_raw) {
      try {
        const schedule = await resolveScheduling(intent.entities.time_raw, ranked[0], userProfile);

        logTrace('SchedulingAgent', null, {
          observation: `User wants service at: "${intent.entities.time_raw}"`,
          inference: `Parsed to: ${schedule.display_time}, available: ${schedule.is_available}`,
          decision: schedule.recommended_action,
          action: schedule.is_available ? 'Time confirmed' : `Suggesting alternatives: ${schedule.alternatives.join(', ')}`,
        });

        ranked[0].scheduling = schedule;
      } catch (e) {
        console.error('[Scheduling] Error:', e.message);
      }
    }

    // Build response
    const summary = intent.user_friendly_summary || `I found ${ranked.length} ${intent.entities.service_type} providers near you!`;
    session.history.push({ role: 'assistant', content: summary, timestamp: new Date().toISOString() });
    session.currentBooking = { intent, providers: ranked };
    session.lastProviders = ranked;
    session.lastIntent = intent;

    return res.json({
      type: 'providers_found',
      reply: summary,
      intent,
      providers: ranked,
      agentTrace: {
        intentTrace: intent.agent_trace,
        matchingTrace: ranked.map(p => ({
          name: p.name, score: p.matchScore, reasoning: p.aiReasoning, scores: p.scores
        })),
        pricingTrace: priceEstimate?.agent_trace || null,
      }
    });

  } catch (error) {
    console.error('[Chat] Error:', error);

    logTrace('System', null, {
      observation: `Chat endpoint error: ${error.message}`,
      inference: 'Unhandled exception in orchestration pipeline',
      decision: 'Return graceful error to user',
      action: 'Sending friendly error message',
    });

    res.status(500).json({
      type: 'error',
      reply: 'Oops! Something went wrong. Please try again — I\'m still learning! 🙏',
      error: error.message
    });
  }
});

// GET /api/chat/history/:userId
router.get('/history/:userId', (req, res) => {
  const session = sessions[req.params.userId];
  res.json({ history: session?.history || [] });
});

module.exports = router;
