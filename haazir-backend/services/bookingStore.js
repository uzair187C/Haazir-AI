/**
 * Shared Booking Store — Single source of truth for all bookings
 * Used by: bookings.js, webhooks.js, chat.js
 */

const bookings = {};

function createBooking(booking) {
  bookings[booking.id] = booking;
  return booking;
}

function getBooking(bookingId) {
  return bookings[bookingId] || null;
}

function updateBooking(bookingId, updates) {
  if (!bookings[bookingId]) return null;
  Object.assign(bookings[bookingId], updates, { updatedAt: new Date().toISOString() });
  return bookings[bookingId];
}

function getBookingsByUser(userId) {
  return Object.values(bookings).filter(b => b.userId === userId);
}

function getBookingByProviderPhone(phone) {
  return Object.values(bookings).find(b =>
    b.provider?.phone === phone &&
    ['pending_contact', 'message_sent', 'confirmed', 'in_progress'].includes(b.status)
  ) || null;
}

function getAllBookings() {
  return bookings;
}

/**
 * Get booking progress timeline
 */
function getBookingProgress(bookingId) {
  const booking = bookings[bookingId];
  if (!booking) return null;

  const STEPS = [
    { key: 'created', label: 'Booking Created', icon: '📋' },
    { key: 'message_sent', label: 'WhatsApp Sent to Provider', icon: '📱' },
    { key: 'provider_replied', label: 'Provider Replied', icon: '💬' },
    { key: 'confirmed', label: 'Provider Confirmed', icon: '✅' },
    { key: 'in_progress', label: 'Service In Progress', icon: '🔧' },
    { key: 'completed', label: 'Service Completed', icon: '🎉' },
  ];

  const STATUS_ORDER = ['pending_contact', 'message_sent', 'provider_replied', 'confirmed', 'in_progress', 'completed'];
  const currentIdx = STATUS_ORDER.indexOf(booking.status);

  const timeline = STEPS.map((step, i) => {
    const stepIdx = STATUS_ORDER.indexOf(step.key === 'created' ? 'pending_contact' : step.key);
    let status = 'pending';
    if (stepIdx < currentIdx) status = 'completed';
    else if (stepIdx === currentIdx) status = 'current';
    
    // Find timestamp for this step from progress log
    const logEntry = (booking.progressLog || []).find(l => l.step === step.key);
    
    return {
      ...step,
      status,
      timestamp: logEntry?.timestamp || (step.key === 'created' ? booking.createdAt : null),
      detail: logEntry?.detail || null,
    };
  });

  return {
    bookingId,
    status: booking.status,
    provider: booking.provider,
    serviceType: booking.serviceType,
    scheduledTime: booking.scheduledTime,
    timeline,
    whatsappMessages: booking.whatsappMessages || [],
    pendingUserQuestion: booking.pendingUserQuestion || null,
    updatedAt: booking.updatedAt,
  };
}

/**
 * Add a progress log entry to a booking
 */
function addProgressLog(bookingId, step, detail) {
  if (!bookings[bookingId]) return;
  if (!bookings[bookingId].progressLog) bookings[bookingId].progressLog = [];
  bookings[bookingId].progressLog.push({
    step,
    detail,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  createBooking,
  getBooking,
  updateBooking,
  getBookingsByUser,
  getBookingByProviderPhone,
  getAllBookings,
  getBookingProgress,
  addProgressLog,
};
