const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Quality Agent — Handles disputes, feedback analysis, and provider reputation
 */

async function handleDispute(bookingId, disputeType, userMessage, booking) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are the Quality/Dispute Agent for Haazir AI in Pakistan.

A customer has raised a dispute about a booking:
- Dispute type: ${disputeType}
- Customer message: "${userMessage}"
- Service: ${booking.serviceType}
- Provider: ${booking.provider?.name}
- Scheduled time: ${booking.scheduledTime}
- Price estimate: PKR ${booking.priceEstimate}
- Booking status: ${booking.status}

Dispute types and how to handle:
1. "no_show" — Provider didn't arrive. Offer: reschedule, find replacement, or cancel with apology.
2. "bad_quality" — Work was poor. Offer: provider redo, partial refund, find replacement.
3. "price_disagreement" — Provider charged more. Offer: mediate, show original estimate, escalate.
4. "late_arrival" — Provider was late. Offer: discount, reschedule, or proceed.
5. "cancellation" — Provider cancelled. Offer: auto-find replacement immediately.
6. "other" — General complaint. Ask for details, offer solutions.

Respond in JSON:
{
  "resolution": {
    "action": "reschedule|replace|refund|mediate|escalate|cancel",
    "message_to_user": "Friendly message in the user's language explaining what you'll do",
    "message_to_provider": "Professional message to send to provider if needed",
    "find_replacement": true/false,
    "offer_discount": true/false,
    "discount_percent": 0
  },
  "severity": "low|medium|high|critical",
  "agent_trace": {
    "observation": "",
    "inference": "",
    "decision": "",
    "reasoning": ""
  }
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(result.response.text());
    console.log(`[Quality Agent] Dispute ${disputeType}: action=${parsed.resolution.action}, severity=${parsed.severity}`);
    return parsed;
  } catch (error) {
    console.error('[Quality Agent] Error:', error.message);
    return {
      resolution: {
        action: 'escalate',
        message_to_user: 'We apologize for the inconvenience. We are looking into this and will get back to you shortly.',
        message_to_provider: null,
        find_replacement: disputeType === 'no_show' || disputeType === 'cancellation',
        offer_discount: true,
        discount_percent: 10
      },
      severity: 'medium',
      agent_trace: { observation: 'AI dispute resolution failed', inference: 'Using fallback', decision: 'Escalate with discount', reasoning: 'Error in processing' }
    };
  }
}

async function analyzeReviewSentiment(reviewText) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Analyze the sentiment of this service review (can be in Urdu/English/Roman Urdu). Return JSON: {"sentiment": "positive|neutral|negative", "key_points": ["point1", "point2"], "score": 0.0-1.0}\n\nReview: "${reviewText}"` }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    return JSON.parse(result.response.text());
  } catch (e) {
    return { sentiment: 'neutral', key_points: [], score: 0.5 };
  }
}

module.exports = { handleDispute, analyzeReviewSentiment };
