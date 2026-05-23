const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are the AI brain of "Haazir AI" (حاضر — At Your Service), an all-in-one service orchestrator for Pakistan.

You understand Urdu, Roman Urdu, English, and code-switched (mixed) language.

When a user sends a message, extract the following entities:
- service_type: What service/product they need (e.g., "AC repair", "plumber", "pizza delivery", "carpenter")
- location: Where they need it (if mentioned, or use their saved location)  
- time: When they need it (e.g., "kal subah", "tomorrow 10 AM", "abhi", "next Monday")
- urgency: How urgent (emergency/high/medium/low)
- budget: Budget sensitivity (low/medium/high/not_mentioned)
- special_requirements: Any special notes
- confidence: Your confidence in understanding (0.0 to 1.0)

If critical info is MISSING (service type is always required), generate a friendly clarification question in the same language the user used.

ALWAYS respond in valid JSON format:
{
  "understood": true/false,
  "entities": {
    "service_type": "",
    "service_category": "",
    "location": "",
    "time_raw": "",
    "time_parsed": "",
    "urgency": "",
    "budget": "",
    "special_requirements": "",
    "language_detected": ""
  },
  "confidence": 0.0,
  "clarification_needed": true/false,
  "clarification_question": "",
  "user_friendly_summary": "",
  "agent_trace": {
    "observation": "",
    "inference": "",
    "decision": "",
    "reasoning": ""
  }
}`;

async function parseIntent(userMessage, userProfile = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const contextPrompt = userProfile.address
      ? `\nUser's saved location: ${userProfile.address}\nUser's name: ${userProfile.name || 'Unknown'}\nPreferred language: ${userProfile.preferredLanguage || 'auto'}\nPreferred times: ${userProfile.preferredTimes || 'not set'}\nBudget preference: ${userProfile.budgetPreference || 'not set'}`
      : '';

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + contextPrompt + `\n\nUser message: "${userMessage}"` }] }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    console.log('[Intent Agent] Trace:', JSON.stringify(parsed.agent_trace, null, 2));
    return parsed;
  } catch (error) {
    console.error('[Intent Agent] Error:', error.message);
    // Graceful fallback — try to extract service type from message directly
    const words = userMessage.toLowerCase();
    const knownServices = ['plumber','electrician','ac repair','carpenter','mechanic','painter','tutor','beautician','driver','cleaner','pizza','food','grocery','pharmacy','laundry'];
    const found = knownServices.find(s => words.includes(s));
    return {
      understood: !!found,
      entities: {
        service_type: found || userMessage.split(' ').slice(0, 3).join(' '),
        service_category: 'general',
        location: userProfile.address || '',
        time_raw: '', time_parsed: '',
        urgency: 'medium', budget: 'balanced',
        special_requirements: '', language_detected: 'auto'
      },
      confidence: found ? 0.7 : 0.5,
      clarification_needed: !found,
      clarification_question: found ? '' : 'Could you tell me more about what service you need?',
      user_friendly_summary: found ? `Looking for ${found} services near you...` : '',
      agent_trace: { observation: 'AI unavailable, used keyword fallback', inference: `Detected: ${found || 'unknown'}`, decision: found ? 'Proceed with keyword match' : 'Ask clarification', reasoning: 'Gemini API error fallback' }
    };
  }
}

module.exports = { parseIntent };
