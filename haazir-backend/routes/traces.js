const express = require('express');
const router = express.Router();
const { getTraces, exportTracesJSON, getTracesSummary } = require('../services/traceLogger');
const { handleDispute } = require('../agents/qualityAgent');
const { logTrace } = require('../services/traceLogger');

// In-memory booking store reference (shared with bookings route)
const bookings = {};

// GET /api/traces — Get all agent traces (for hackathon submission)
router.get('/', (req, res) => {
  const bookingId = req.query.bookingId;
  res.json({ traces: getTraces(bookingId || null) });
});

// GET /api/traces/export — Export all traces as JSON file
router.get('/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=agent_traces.json');
  res.send(exportTracesJSON());
});

// GET /api/traces/summary — Trace summary stats
router.get('/summary', (req, res) => {
  res.json(getTracesSummary());
});

// POST /api/disputes/raise — Raise a dispute
router.post('/disputes/raise', async (req, res) => {
  try {
    const { bookingId, disputeType, message } = req.body;

    // Get booking (in production, from Firestore)
    const booking = bookings[bookingId] || {
      serviceType: req.body.serviceType || 'Unknown',
      provider: { name: req.body.providerName || 'Unknown' },
      scheduledTime: req.body.scheduledTime || 'Unknown',
      priceEstimate: req.body.priceEstimate || 0,
      status: 'completed',
    };

    const resolution = await handleDispute(bookingId, disputeType, message, booking);

    logTrace('QualityAgent', bookingId, {
      observation: `Dispute raised: ${disputeType} — "${message}"`,
      inference: `Severity: ${resolution.severity}`,
      decision: `Action: ${resolution.resolution.action}`,
      action: `Sent resolution message to user, find_replacement: ${resolution.resolution.find_replacement}`,
      reasoning: resolution.agent_trace?.reasoning,
    });

    res.json(resolution);
  } catch (error) {
    console.error('[Dispute] Error:', error.message);
    res.status(500).json({ error: 'Failed to process dispute' });
  }
});

module.exports = router;
