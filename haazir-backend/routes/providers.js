const express = require('express');
const router = express.Router();
const { findProviders } = require('../agents/discoveryAgent');
const { rankProviders } = require('../agents/matchingAgent');

// POST /api/providers/find — Standalone provider search
router.post('/find', async (req, res) => {
  try {
    const { serviceType, location, budget, urgency, radius } = req.body;

    if (!serviceType) {
      return res.status(400).json({ error: 'serviceType is required' });
    }

    const userLocation = location || { lat: 31.5204, lng: 74.3587, address: 'Lahore' };
    const searchRadius = radius || 30000;

    const providers = await findProviders(serviceType, userLocation, searchRadius);

    if (providers.length === 0) {
      return res.json({ providers: [], message: 'No providers found in your area' });
    }

    const ranked = await rankProviders(providers, {
      service_type: serviceType,
      budget: budget || 'medium',
      urgency: urgency || 'medium',
    });

    res.json({ providers: ranked, total: ranked.length });
  } catch (error) {
    console.error('[Providers] Error:', error.message);
    res.status(500).json({ error: 'Failed to find providers' });
  }
});

module.exports = router;
