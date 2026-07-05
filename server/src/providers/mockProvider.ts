import { LocationProvider, Participant, TravelLeg, Venue, VenueCategory } from "../types";
import { destinationPoint, estimateDurationMinutes } from "../geo";

// Deterministic-ish fixture venues so the whole flow (add people -> ranked
// results) is demoable without any external API. Placed at varying
// bearings/distances from whatever seed point is passed in.
const FIXTURES: { name: string; category: VenueCategory; bearingDeg: number; distanceFraction: number; rating: number }[] = [
  { name: "Central Station", category: "train_station", bearingDeg: 10, distanceFraction: 0.4, rating: 4.4 },
  { name: "Riverside Subway Stop", category: "subway_station", bearingDeg: 70, distanceFraction: 0.8, rating: 4.1 },
  { name: "Uptown Transit Center", category: "transit_station", bearingDeg: 140, distanceFraction: 0.6, rating: 4.0 },
  { name: "The Daily Grind Cafe", category: "cafe", bearingDeg: 200, distanceFraction: 0.3, rating: 4.5 },
  { name: "Green Common Park", category: "park", bearingDeg: 260, distanceFraction: 0.9, rating: 4.6 },
  { name: "Market Square Library", category: "library", bearingDeg: 300, distanceFraction: 0.5, rating: 4.3 },
  { name: "Harbor View Restaurant", category: "restaurant", bearingDeg: 330, distanceFraction: 0.7, rating: 4.2 },
  { name: "Old Town Bar & Grill", category: "bar", bearingDeg: 30, distanceFraction: 1.0, rating: 3.9 },
  { name: "Westside Mall", category: "shopping_mall", bearingDeg: 100, distanceFraction: 0.85, rating: 4.0 },
  { name: "Elm Street Station", category: "train_station", bearingDeg: 190, distanceFraction: 0.55, rating: 4.3 },
];

export class MockProvider implements LocationProvider {
  async findCandidateVenues(seed: { lat: number; lng: number }, radiusMeters: number): Promise<Venue[]> {
    return FIXTURES.map((f, i) => {
      const pos = destinationPoint(seed, f.bearingDeg, f.distanceFraction * radiusMeters);
      return {
        id: `mock-${i}`,
        name: f.name,
        category: f.category,
        address: `${100 + i} ${f.name.split(" ")[0]} Ave`,
        lat: pos.lat,
        lng: pos.lng,
        rating: f.rating,
        userRatingsTotal: 50 + i * 37,
      };
    });
  }

  async getTravelTimes(participants: Participant[], venues: Venue[]): Promise<TravelLeg[][]> {
    return venues.map((venue) =>
      participants.map((p, participantIndex) => {
        const mode = p.mode ?? "transit";
        return { participantIndex, durationMinutes: estimateDurationMinutes(p, venue, mode), mode };
      })
    );
  }
}
