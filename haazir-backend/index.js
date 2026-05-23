const express = require('express');
const cors = require('cors');
require('dotenv').config();

const chatRoutes = require('./routes/chat');
const providerRoutes = require('./routes/providers');
const bookingRoutes = require('./routes/bookings');
const feedbackRoutes = require('./routes/feedback');
const webhookRoutes = require('./routes/webhooks');
const traceRoutes = require('./routes/traces');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/traces', traceRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Haazir AI — حاضر',
    tagline: 'At Your Service',
    status: 'live',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: 'POST /api/chat/send',
      providers: '/api/providers',
      bookings: 'POST /api/bookings/create',
      feedback: 'POST /api/feedback/submit',
    },
    hackathon: 'Google Antigravity Hackathon 2026',
  });
});

// Health check
const { getTracesSummary } = require('./services/traceLogger');
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Haazir AI Backend',
    agents: ['IntentAgent', 'DiscoveryAgent', 'MatchingAgent', 'PricingAgent', 'SchedulingAgent', 'QualityAgent'],
    traces: getTracesSummary(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Haazir AI Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
});
