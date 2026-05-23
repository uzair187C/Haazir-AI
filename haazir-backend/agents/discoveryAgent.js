const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PLACES_BASE_URL = 'https://places.googleapis.com/v1/places';

// Map common service names to Google Places types
const SERVICE_TYPE_MAP = {
  'plumber': { types: ['plumber'], query: 'plumber' },
  'electrician': { types: ['electrician'], query: 'electrician' },
  'ac repair': { types: ['electrician'], query: 'AC repair technician' },
  'ac service': { types: ['electrician'], query: 'AC service technician' },
  'carpenter': { types: [], query: 'carpenter' },
  'mechanic': { types: ['car_repair'], query: 'mechanic' },
  'painter': { types: [], query: 'house painter' },
  'tutor': { types: [], query: 'tutor academy' },
  'beautician': { types: ['beauty_salon'], query: 'beautician' },
  'driver': { types: [], query: 'driver service' },
  'food': { types: ['restaurant'], query: 'restaurant' },
  'pizza': { types: ['restaurant'], query: 'pizza delivery' },
  'grocery': { types: ['grocery_store'], query: 'grocery store' },
  'pharmacy': { types: ['pharmacy'], query: 'pharmacy' },
  'laundry': { types: ['laundry'], query: 'laundry dry cleaning' },
  'cleaning': { types: [], query: 'home cleaning service' },
};

async function findProviders(serviceType, location, radius = 30000) {
  const serviceKey = serviceType.toLowerCase();
  const mapping = SERVICE_TYPE_MAP[serviceKey] || { types: [], query: serviceType };

  try {
    // Use Text Search for flexibility (handles any service type)
    const response = await axios.post(
      `${PLACES_BASE_URL}:searchText`,
      {
        textQuery: `${mapping.query} near ${location.address || ''}`,
        locationBias: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: radius
          }
        },
        maxResultCount: 10,
        languageCode: 'en'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.currentOpeningHours,places.businessStatus,places.googleMapsUri,places.location,places.reviews'
        }
      }
    );

    const places = response.data.places || [];

    // Transform to our provider format
    const providers = places.map((place, index) => ({
      id: `provider_${index + 1}`,
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || '',
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
      isOpen: place.businessStatus === 'OPERATIONAL',
      googleMapsUrl: place.googleMapsUri || '',
      location: place.location || null,
      recentReviews: (place.reviews || []).slice(0, 3).map(r => ({
        rating: r.rating,
        text: r.text?.text || '',
        time: r.relativePublishTimeDescription || ''
      })),
      // These will be calculated by the Matching Agent
      matchScore: 0,
      distanceKm: 0,
    }));

    // Calculate distance for each provider
    providers.forEach(p => {
      if (p.location && location.lat && location.lng) {
        p.distanceKm = calculateDistance(
          location.lat, location.lng,
          p.location.latitude, p.location.longitude
        );
      }
    });

    console.log(`[Discovery Agent] Found ${providers.length} providers for "${serviceType}"`);
    return providers;

  } catch (error) {
    console.error('[Discovery Agent] Error:', error.response?.data || error.message);
    // Fallback: return empty with helpful message
    return [];
  }
}

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

module.exports = { findProviders };
