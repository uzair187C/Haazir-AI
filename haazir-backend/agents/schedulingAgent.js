const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Scheduling Agent — Handles time conflicts, alternative suggestions, and reminders
 */

async function resolveScheduling(requestedTime, provider, userProfile = {}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are the Scheduling Agent for Haazir AI. A user wants a service at a specific time.

Requested time: "${requestedTime}"
Provider: ${provider.name}
Provider open now: ${provider.isOpen}
Provider hours: ${JSON.stringify(provider.currentOpeningHours || 'unknown')}
User preferred time: ${userProfile.preferredTime || 'anytime'}
Current time: ${new Date().toISOString()}

Tasks:
1. Parse the requested time into a clear date/time
2. Check if the provider is likely available at that time
3. If there's a conflict (closed hours, past time, etc.), suggest 2-3 alternatives
4. Flag if it's urgent (within 2 hours)

Respond in JSON:
{
  "parsed_time": "ISO datetime string",
  "is_available": true/false,
  "conflict_reason": "string or null",
  "is_urgent": true/false,
  "alternatives": ["alt time 1", "alt time 2"],
  "recommended_action": "proceed|suggest_alternative|warn_urgent",
  "display_time": "human readable time in user's language",
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
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(result.response.text());
    console.log(`[Scheduling Agent] Time: ${parsed.display_time}, available: ${parsed.is_available}`);
    return parsed;
  } catch (error) {
    console.error('[Scheduling Agent] Error:', error.message);
    return {
      parsed_time: new Date().toISOString(),
      is_available: true,
      conflict_reason: null,
      is_urgent: false,
      alternatives: [],
      recommended_action: 'proceed',
      display_time: requestedTime,
      agent_trace: { observation: 'Scheduling parse failed', inference: 'Defaulting to proceed', decision: 'Allow booking', reasoning: 'Fallback' }
    };
  }
}

module.exports = { resolveScheduling };
