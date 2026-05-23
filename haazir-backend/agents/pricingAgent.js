const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Pricing Agent — Generates dynamic price estimates with breakdown
 */
async function estimatePrice(serviceType, provider, userRequest = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are the Pricing Agent for Haazir AI in Pakistan. Generate a realistic price estimate in PKR.

Service: ${serviceType}
Provider: ${provider.name} (Rating: ${provider.rating}★, ${provider.reviewCount} reviews)
Distance: ${provider.distanceKm || '?'} km from user
Urgency: ${userRequest.urgency || 'medium'}
Time: ${userRequest.time || 'standard hours'}
Budget preference: ${userRequest.budget || 'balanced'}

Generate a price estimate with breakdown. Consider:
- Base service fee (market rate in Pakistan for this service)
- Travel/distance charge (if > 5km)
- Urgency surcharge (if emergency/high urgency, add 20-50%)
- Time premium (if outside 9AM-6PM, add 15%)
- Discount if budget-conscious user

Respond in JSON:
{
  "total": number,
  "currency": "PKR",
  "breakdown": {
    "base_fee": number,
    "travel_charge": number,
    "urgency_surcharge": number,
    "time_premium": number,
    "discount": number
  },
  "confidence": "low|medium|high",
  "note": "brief explanation",
  "agent_trace": {
    "observation": "",
    "inference": "",
    "decision": "",
    "reasoning": ""
  }
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(result.response.text());
    console.log(`[Pricing Agent] ${serviceType}: PKR ${parsed.total} (${parsed.confidence} confidence)`);
    return parsed;

  } catch (error) {
    console.error('[Pricing Agent] Error:', error.message);
    // Fallback pricing
    return {
      total: 2500,
      currency: 'PKR',
      breakdown: { base_fee: 2000, travel_charge: 300, urgency_surcharge: 0, time_premium: 0, discount: -200 },
      confidence: 'low',
      note: 'Estimated based on market averages',
      agent_trace: { observation: 'Pricing API failed', inference: 'Using fallback', decision: 'Default PKR 2500', reasoning: 'Error in AI pricing' }
    };
  }
}

module.exports = { estimatePrice };
