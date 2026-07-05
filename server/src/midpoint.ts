import { LocationProvider, Participant, RankedVenue, TravelLeg, Venue } from "./types";

// Rough prominence bonus so a well-known transit hub outranks an obscure shop
// at a similar travel time. Expressed in "equivalent minutes" subtracted from
// the venue's score before ranking.
const CATEGORY_BONUS_MINUTES: Record<Venue["category"], number> = {
  train_station: 4,
  subway_station: 4,
  transit_station: 3,
  library: 1,
  park: 1,
  shopping_mall: 1,
  cafe: 0,
  restaurant: 0,
  bar: 0,
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Geographic median (Weiszfeld's algorithm): resistant to one outlier
 * participant dragging a simple average off toward them.
 */
function geographicMedian(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  let estimate = {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };

  for (let iter = 0; iter < 50; iter++) {
    let weightSum = 0;
    let latSum = 0;
    let lngSum = 0;
    for (const p of points) {
      const d = haversineMeters(estimate, p) || 1e-6;
      const w = 1 / d;
      weightSum += w;
      latSum += p.lat * w;
      lngSum += p.lng * w;
    }
    const next = { lat: latSum / weightSum, lng: lngSum / weightSum };
    if (haversineMeters(estimate, next) < 1) {
      estimate = next;
      break;
    }
    estimate = next;
  }
  return estimate;
}

function maxPairwiseSpreadMeters(points: { lat: number; lng: number }[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, haversineMeters(points[i], points[j]));
    }
  }
  return max;
}

export interface MidpointResult {
  seed: { lat: number; lng: number };
  venues: RankedVenue[];
}

export async function findMidpoint(
  participants: Participant[],
  provider: LocationProvider
): Promise<MidpointResult> {
  if (participants.length < 2) {
    throw new Error("At least 2 participants are required");
  }

  const seed = geographicMedian(participants);
  const spread = maxPairwiseSpreadMeters(participants);
  // Search a radius big enough to plausibly contain a fair meeting spot,
  // but not so big we pull in venues nobody would reasonably travel to.
  const radiusMeters = Math.min(Math.max(spread * 0.6, 800), 15000);

  const candidates = await provider.findCandidateVenues(seed, radiusMeters);
  if (candidates.length === 0) {
    return { seed, venues: [] };
  }

  const legsPerVenue = await provider.getTravelTimes(participants, candidates);

  const ranked: RankedVenue[] = candidates.map((venue, i) => {
    const legs: TravelLeg[] = legsPerVenue[i];
    const durations = legs.map((l) => l.durationMinutes);
    const maxMinutes = Math.max(...durations);
    const avgMinutes = durations.reduce((s, d) => s + d, 0) / durations.length;
    const bonus = CATEGORY_BONUS_MINUTES[venue.category] ?? 0;
    // Lower score is better: minimize worst-case trip first, then average,
    // with well-known venue types getting a small edge on ties.
    const score = maxMinutes * 10 + avgMinutes - bonus;
    return { ...venue, legs, maxMinutes, avgMinutes, score };
  });

  ranked.sort((a, b) => a.score - b.score);

  return { seed, venues: ranked.slice(0, 5) };
}
