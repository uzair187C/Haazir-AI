const express = require('express');
const router = express.Router();
const { callGemini } = require('../services/geminiHelper');
const { logTrace } = require('../services/traceLogger');

// In-memory review store
const reviews = {};

// In-memory provider reputation store (L4 — Provider Reputation Updates)
const providerReputation = {};

/**
 * Update provider reputation score based on new review
 */
function updateReputation(providerPhone, rating, serviceType) {
  if (!providerPhone) return;

  if (!providerReputation[providerPhone]) {
    providerReputation[providerPhone] = {
      phone: providerPhone,
      totalReviews: 0,
      totalRating: 0,
      averageRating: 0,
      serviceBreakdown: {},
      recentTrend: 'stable', // improving | declining | stable
      recentRatings: [],
      reputationScore: 50, // 0-100 scale
      lastUpdated: null,
    };
  }

  const rep = providerReputation[providerPhone];
  rep.totalReviews++;
  rep.totalRating += rating;
  rep.averageRating = Math.round((rep.totalRating / rep.totalReviews) * 10) / 10;

  // Track recent ratings for trend
  rep.recentRatings.push(rating);
  if (rep.recentRatings.length > 10) rep.recentRatings.shift();

  // Calculate trend
  if (rep.recentRatings.length >= 3) {
    const recent = rep.recentRatings.slice(-3);
    const older = rep.recentRatings.slice(-6, -3);
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      rep.recentTrend = recentAvg > olderAvg + 0.3 ? 'improving' : recentAvg < olderAvg - 0.3 ? 'declining' : 'stable';
    }
  }

  // Service breakdown
  if (serviceType) {
    if (!rep.serviceBreakdown[serviceType]) {
      rep.serviceBreakdown[serviceType] = { count: 0, totalRating: 0, avg: 0 };
    }
    rep.serviceBreakdown[serviceType].count++;
    rep.serviceBreakdown[serviceType].totalRating += rating;
    rep.serviceBreakdown[serviceType].avg = Math.round(
      (rep.serviceBreakdown[serviceType].totalRating / rep.serviceBreakdown[serviceType].count) * 10
    ) / 10;
  }

  // Reputation score (0-100) — weighted formula
  const ratingScore = (rep.averageRating / 5) * 60; // 60% weight
  const volumeScore = Math.min(rep.totalReviews / 20, 1) * 25; // 25% weight
  const trendBonus = rep.recentTrend === 'improving' ? 10 : rep.recentTrend === 'declining' ? -5 : 5; // 15% weight
  rep.reputationScore = Math.round(Math.min(100, Math.max(0, ratingScore + volumeScore + trendBonus)));

  rep.lastUpdated = new Date().toISOString();
  return rep;
}

// POST /api/feedback/submit
router.post('/submit', async (req, res) => {
  try {
    const { bookingId, userId, providerPhone, rating, comment, serviceType, tags } = req.body;

    const reviewId = `review_${Date.now()}`;
    const review = {
      id: reviewId,
      bookingId,
      userId,
      providerPhone,
      rating,
      comment: comment || '',
      tags: tags || [],
      serviceType,
      createdAt: new Date().toISOString(),
    };

    // Sentiment analysis on review (if comment exists)
    if (comment && comment.length > 5) {
      try {
        const sentiment = await callGemini(
          `Analyze the sentiment of this service review (can be in Urdu/English/Roman Urdu). Return JSON: {"sentiment": "positive|neutral|negative", "key_points": ["point1", "point2"], "score": 0.0-1.0}\n\nReview: "${comment}"`,
          { temperature: 0.1 }
        );
        review.sentiment = sentiment;
      } catch (e) {
        review.sentiment = { sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral', score: rating / 5 };
      }
    }

    reviews[reviewId] = review;

    // Update provider reputation (L4)
    const reputation = updateReputation(providerPhone, rating, serviceType);

    logTrace('QualityAgent', bookingId, {
      observation: `Review submitted: ${rating}★ for ${serviceType}`,
      inference: `Sentiment: ${review.sentiment?.sentiment || 'unknown'}, reputation score: ${reputation?.reputationScore || 'N/A'}`,
      decision: 'Update provider reputation',
      action: `Reputation updated to ${reputation?.reputationScore}/100 (trend: ${reputation?.recentTrend})`,
    });

    console.log(`[Feedback] ${reviewId}: ${rating}★ for booking ${bookingId} | Reputation: ${reputation?.reputationScore}/100`);

    res.json({
      review,
      reputation: reputation ? {
        averageRating: reputation.averageRating,
        totalReviews: reputation.totalReviews,
        reputationScore: reputation.reputationScore,
        trend: reputation.recentTrend,
      } : null,
      message: 'Thank you for your feedback! 🙏',
    });
  } catch (error) {
    console.error('[Feedback] Error:', error.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/provider/:phone — Get reviews for a provider
router.get('/provider/:phone', (req, res) => {
  const providerReviews = Object.values(reviews).filter(r => r.providerPhone === req.params.phone);
  const reputation = providerReputation[req.params.phone] || null;

  res.json({
    reviews: providerReviews,
    averageRating: reputation?.averageRating || null,
    total: providerReviews.length,
    reputation: reputation ? {
      reputationScore: reputation.reputationScore,
      trend: reputation.recentTrend,
      serviceBreakdown: reputation.serviceBreakdown,
    } : null,
  });
});

// GET /api/feedback/reputation/:phone — Get provider reputation only
router.get('/reputation/:phone', (req, res) => {
  const reputation = providerReputation[req.params.phone];
  if (!reputation) {
    return res.json({ phone: req.params.phone, reputationScore: 50, message: 'No reviews yet' });
  }
  res.json(reputation);
});

module.exports = router;
