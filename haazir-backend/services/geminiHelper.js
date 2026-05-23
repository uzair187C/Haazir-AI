const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini Helper — Centralized Gemini API calls with retry + backoff
 * Handles 429 rate limits gracefully for free-tier keys
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 6000; // 6 seconds between retries

async function callGemini(prompt, options = {}) {
  const {
    model: modelName = 'gemini-2.5-flash',
    temperature = 0.2,
    jsonMode = true,
    retries = MAX_RETRIES,
  } = options;

  const model = genAI.getGenerativeModel({ model: modelName });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const config = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };

      const result = await model.generateContent(config);
      const text = result.response.text();

      if (jsonMode) {
        return JSON.parse(text);
      }
      return text;

    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota');

      if (isRateLimit && attempt < retries) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`[Gemini] Rate limited (attempt ${attempt}/${retries}), retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      // Not a rate limit or out of retries
      throw error;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getModel(modelName = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

module.exports = { callGemini, getModel, genAI };
