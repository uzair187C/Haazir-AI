const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Matching Agent — Ranks providers using 8 weighted factors
 * Uses AI to generate reasoning for each ranking decision
 */
async function rankProviders(providers, userRequest, userProfile = {}) {
  if (!providers || providers.length === 0) return [];

  // Step 1: Calculate raw scores for each factor
  const scored = providers.map(provider => {
    const scores = {
      distance: scoreDistance(provider.distanceKm),
      rating: scoreRating(provider.rating),
      reviewVolume: scoreReviewVolume(provider.reviewCount),
      reviewRecency: scoreReviewRecency(provider.recentReviews),
      availability: provider.isOpen ? 1.0 : 0.3,
      priceMatch: scorePriceMatch(provider, userRequest),
      specialization: 0.7, // Default, enhanced by AI
      reliability: scoreReliability(provider),
    };

    // Dynamic weights based on user preferences
    const weights = getWeights(userRequest, userProfile);
    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      ...provider,
      scores,
      weights,
      matchScore: Math.round(totalScore * 100) / 100,
    };
  });

  // Step 2: Sort by match score
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Step 3: Get AI reasoning for top 3
  const top3 = scored.slice(0, 3);
  const reasoning = await generateMatchingReasoning(top3, userRequest);

  top3.forEach((provider, i) => {
    provider.rank = i + 1;
    provider.aiReasoning = reasoning[i] || 'Ranked based on overall score';
  });

  console.log('[Matching Agent] Rankings:', top3.map(p => `${p.rank}. ${p.name} (${p.matchScore})`));
  return top3;
}

function scoreDistance(km) {
  if (!km || km <= 0) return 0.5;
  if (km <= 2) return 1.0;
  if (km <= 5) return 0.85;
  if (km <= 10) return 0.7;
  if (km <= 20) return 0.5;
  if (km <= 30) return 0.3;
  return 0.1;
}

function scoreRating(rating) {
  if (!rating) return 0.3;
  return Math.min(rating / 5, 1.0);
}

function scoreReviewVolume(count) {
  if (!count) return 0.1;
  if (count >= 100) return 1.0;
  if (count >= 50) return 0.8;
  if (count >= 20) return 0.6;
  if (count >= 5) return 0.4;
  return 0.2;
}

function scoreReviewRecency(reviews) {
  if (!reviews || reviews.length === 0) return 0.3;
  // Check if any review mentions "week" or "month" (recent)
  const hasRecent = reviews.some(r =>
    r.time && (r.time.includes('week') || r.time.includes('day') || r.time.includes('month'))
  );
  return hasRecent ? 0.9 : 0.5;
}

function scorePriceMatch(provider, request) {
  // Without actual price data, use heuristics
  if (request.budget === 'low') return 0.7; // Prefer budget-friendly
  return 0.6;
}

function scoreReliability(provider) {
  // Based on rating + review volume as proxy for reliability
  const ratingScore = (provider.rating || 3) / 5;
  const volumeScore = Math.min((provider.reviewCount || 0) / 50, 1);
  return (ratingScore * 0.7 + volumeScore * 0.3);
}

function getWeights(request, profile) {
  // Default weights
  const weights = {
    distance: 0.15,
    rating: 0.20,
    reviewVolume: 0.10,
    reviewRecency: 0.10,
    availability: 0.10,
    priceMatch: 0.10,
    specialization: 0.15,
    reliability: 0.10,
  };

  // Adjust based on user preferences
  if (request.budget === 'low' || profile.budgetPreference === 'budget') {
    weights.priceMatch = 0.25;
    weights.rating -= 0.05;
    weights.distance -= 0.05;
  }
  if (request.urgency === 'high' || request.urgency === 'emergency') {
    weights.availability = 0.25;
    weights.distance = 0.20;
    weights.reviewRecency -= 0.05;
  }
  if (profile.budgetPreference === 'premium') {
    weights.rating = 0.30;
    weights.specialization = 0.20;
    weights.priceMatch = 0.05;
  }

  return weights;
}

async function generateMatchingReasoning(providers, request) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are the Matching Agent for Haazir AI. Explain briefly WHY each provider was ranked this way. User wants: ${request.service_type}, budget: ${request.budget}, urgency: ${request.urgency}.

Providers:
${providers.map((p, i) => `${i + 1}. ${p.name} — Rating: ${p.rating}★ (${p.reviewCount} reviews), Distance: ${p.distanceKm}km, Open: ${p.isOpen}, Score: ${p.matchScore}`).join('\n')}

Respond as JSON array of 3 strings — one reason per provider. Be concise (1-2 sentences each). Mention specific factors.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    });

    return JSON.parse(result.response.text());
  } catch (e) {
    console.error('[Matching Agent] Reasoning error:', e.message);
    return providers.map(() => 'Ranked by combined score of distance, rating, and availability.');
  }
}

module.exports = { rankProviders };
