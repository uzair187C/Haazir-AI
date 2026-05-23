const admin = require('firebase-admin');

// Initialize Firebase Admin with Application Default Credentials
// In production on Cloud Run, this uses the service account automatically.
// Locally, it uses GOOGLE_APPLICATION_CREDENTIALS env var or the project ID.
admin.initializeApp({
  projectId: 'haazir-ai-496420',
});

const db = admin.firestore();

// ---- USER OPERATIONS ----

async function saveUser(userId, data) {
  await db.collection('users').doc(userId).set({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`[Firestore] Saved user: ${userId}`);
}

async function getUser(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// ---- BOOKING OPERATIONS ----

async function saveBooking(booking) {
  const ref = db.collection('bookings').doc(booking.id);
  await ref.set({
    ...booking,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`[Firestore] Saved booking: ${booking.id}`);
  return booking.id;
}

async function updateBookingStatus(bookingId, status, extra = {}) {
  await db.collection('bookings').doc(bookingId).update({
    status,
    ...extra,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`[Firestore] Booking ${bookingId} → ${status}`);
}

async function getBooking(bookingId) {
  const doc = await db.collection('bookings').doc(bookingId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getUserBookings(userId) {
  const snapshot = await db.collection('bookings')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- REVIEW OPERATIONS ----

async function saveReview(review) {
  const ref = db.collection('reviews').doc(review.id);
  await ref.set({
    ...review,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`[Firestore] Saved review: ${review.id}`);
}

// ---- AGENT TRACE OPERATIONS ----

async function saveAgentTrace(trace) {
  const ref = db.collection('agent_traces').doc();
  await ref.set({
    ...trace,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`[Firestore] Saved agent trace for: ${trace.step}`);
  return ref.id;
}

async function getTracesForBooking(bookingId) {
  const snapshot = await db.collection('agent_traces')
    .where('bookingId', '==', bookingId)
    .orderBy('timestamp', 'asc')
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- CHAT HISTORY ----

async function saveChatMessage(userId, message) {
  await db.collection('chat_history').doc(userId)
    .collection('messages').add({
      ...message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function getChatHistory(userId, limit = 50) {
  const snapshot = await db.collection('chat_history').doc(userId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

module.exports = {
  db,
  saveUser,
  getUser,
  saveBooking,
  updateBookingStatus,
  getBooking,
  getUserBookings,
  saveReview,
  saveAgentTrace,
  getTracesForBooking,
  saveChatMessage,
  getChatHistory,
};
