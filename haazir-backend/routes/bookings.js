const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createBooking, getBooking, updateBooking, getBookingsByUser, getBookingProgress, addProgressLog, getAllBookings } = require('../services/bookingStore');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/bookings/create — with duplicate/conflict detection
router.post('/create', async (req, res) => {
  try {
    const { userId, provider, serviceType, scheduledTime, priceEstimate, priceBreakdown, location } = req.body;

    // Conflict detection: check if another user already booked this provider at the same time
    const allBookings = getAllBookings();
    const existingConflict = Object.values(allBookings).find(b =>
      b.provider?.phone === provider.phone &&
      b.scheduledTime === scheduledTime &&
      ['confirmed', 'message_sent', 'in_progress'].includes(b.status) &&
      b.userId !== userId
    );

    if (existingConflict) {
      console.log(`[Booking] Conflict detected: ${provider.name} already booked by another user at ${scheduledTime}`);
    }

    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const booking = createBooking({
      id: bookingId,
      userId,
      provider: {
        name: provider.name,
        phone: provider.phone,
        rating: provider.rating,
        address: provider.address,
      },
      serviceType,
      scheduledTime,
      location,
      priceEstimate,
      priceBreakdown,
      status: 'pending_contact',
      whatsappMessages: [],
      agentTrace: [],
      progressLog: [],
      hasConflict: !!existingConflict,
      pendingUserQuestion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    addProgressLog(bookingId, 'created', `Booking created for ${serviceType} with ${provider.name}`);

    console.log(`[Booking] Created: ${bookingId} for ${serviceType} with ${provider.name}${existingConflict ? ' (CONFLICT)' : ''}`);
    res.json({
      booking,
      conflict: existingConflict ? {
        message: `Note: Another user has also requested ${provider.name} at ${scheduledTime}. The provider will be asked about availability for both requests.`,
        existingBookingId: existingConflict.id,
      } : null,
    });
  } catch (error) {
    console.error('[Booking] Error:', error.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings/:bookingId
router.get('/:bookingId', (req, res) => {
  const booking = getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking });
});

// GET /api/bookings/:bookingId/progress — Progress tracker timeline
router.get('/:bookingId/progress', (req, res) => {
  const progress = getBookingProgress(req.params.bookingId);
  if (!progress) return res.status(404).json({ error: 'Booking not found' });
  res.json(progress);
});

// POST /api/bookings/:bookingId/user-reply — User answers provider's question
router.post('/:bookingId/user-reply', async (req, res) => {
  try {
    const booking = getBooking(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { reply } = req.body;
    const providerQuestion = booking.pendingUserQuestion;

    // Generate a WhatsApp message combining user's answer with context
    let messageToProvider = reply;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `You are Haazir AI assistant. The provider "${booking.provider.name}" asked: "${providerQuestion}". The customer replied: "${reply}". Generate a polite WhatsApp message in Roman Urdu to send the customer's answer to the provider. Keep it 1-2 lines, professional. Return ONLY the message text.` }] }],
        generationConfig: { temperature: 0.2 }
      });
      messageToProvider = result.response.text().trim();
    } catch (e) {
      messageToProvider = reply;
    }

    // Clear the pending question
    updateBooking(req.params.bookingId, { pendingUserQuestion: null });

    // Send via internal WhatsApp Meta API
    try {
      await axios.post(`http://localhost:${process.env.PORT || 3001}/api/webhooks/send-whatsapp`, { to: booking.provider.phone, message: messageToProvider, bookingId: booking.id });
    } catch (e) {
      console.log(`[WhatsApp] Internal Meta API call failed. Error:`, e.message);
    }

    booking.whatsappMessages.push({
      direction: 'outgoing',
      to: booking.provider.phone,
      text: messageToProvider,
      type: 'user_reply_forwarded',
      timestamp: new Date().toISOString(),
    });

    res.json({ sent: true, message: messageToProvider });
  } catch (error) {
    console.error('[Booking] User reply error:', error.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// PATCH /api/bookings/:bookingId/status
router.patch('/:bookingId/status', (req, res) => {
  const booking = getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  updateBooking(req.params.bookingId, { status: req.body.status });

  if (req.body.whatsappMessage) {
    booking.whatsappMessages.push(req.body.whatsappMessage);
  }

  console.log(`[Booking] ${booking.id} status → ${req.body.status}`);
  res.json({ booking });
});

// GET /api/bookings/user/:userId
router.get('/user/:userId', (req, res) => {
  const userBookings = getBookingsByUser(req.params.userId);
  res.json({ bookings: userBookings });
});

// POST /api/bookings/:bookingId/generate-message — AI generates WhatsApp message
router.post('/:bookingId/generate-message', async (req, res) => {
  try {
    const booking = getBooking(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Generate a polite WhatsApp message in Roman Urdu to contact a service provider.
Context:
- Service needed: ${booking.serviceType}
- Scheduled time: ${booking.scheduledTime}
- Provider name: ${booking.provider.name}

The message should:
1. Start with "AOA" (greeting)
2. Briefly mention the service needed and when
3. Ask if they are available
4. Be friendly and professional
5. NOT reveal the customer's exact address yet
6. Be 2-3 lines max

Return ONLY the message text, nothing else.`;

    const result = await model.generateContent(prompt);
    const message = result.response.text().trim();

    res.json({ message, bookingId: booking.id, providerPhone: booking.provider.phone });
  } catch (error) {
    console.error('[Booking] Message gen error:', error.message);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// POST /api/bookings/:bookingId/cancel-replace — Provider cancels → auto-find replacement
router.post('/:bookingId/cancel-replace', async (req, res) => {
  try {
    const booking = getBooking(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { reason } = req.body;
    updateBooking(req.params.bookingId, { status: 'provider_cancelled', cancellationReason: reason || 'Provider cancelled' });
    addProgressLog(req.params.bookingId, 'provider_cancelled', `${booking.provider.name} cancelled: ${reason || 'No reason given'}`);

    console.log(`[Booking] ${booking.id} cancelled by provider: ${reason}`);

    const { findProviders } = require('../agents/discoveryAgent');
    const { rankProviders } = require('../agents/matchingAgent');
    const { logTrace } = require('../services/traceLogger');

    const location = booking.location || { lat: 31.5204, lng: 74.3587, address: 'Lahore' };
    const providers = await findProviders(booking.serviceType, location);
    const filteredProviders = providers.filter(p =>
      p.name !== booking.provider.name && p.phone !== booking.provider.phone
    );

    if (filteredProviders.length === 0) {
      return res.json({
        cancelled: true, replacement: null,
        message: `${booking.provider.name} cancelled. Unfortunately, no replacement providers are available right now.`,
      });
    }

    const ranked = await rankProviders(filteredProviders, {
      service_type: booking.serviceType, budget: 'balanced', urgency: 'high',
    });

    addProgressLog(req.params.bookingId, 'replacement_found', `Auto-found replacement: ${ranked[0]?.name}`);

    res.json({
      cancelled: true,
      originalProvider: booking.provider.name,
      replacement: ranked[0] || null,
      alternatives: ranked.slice(1),
      message: `${booking.provider.name} cancelled. I found ${ranked.length} replacement${ranked.length > 1 ? 's' : ''}! ${ranked[0]?.name} (${ranked[0]?.rating}★) is my top pick.`,
    });
  } catch (error) {
    console.error('[Booking] Cancel-replace error:', error.message);
    res.status(500).json({ error: 'Failed to find replacement' });
  }
});

module.exports = router;
