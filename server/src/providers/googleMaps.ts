import { LocationProvider, Participant, TravelLeg, Venue, VenueCategory } from "../types";

const PLACE_TYPES: VenueCategory[] = [
  "train_station",
  "subway_station",
  "transit_station",
  "cafe",
  "restaurant",
  "bar",
  "park",
  "library",
  "shopping_mall",
];

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
}

/**
 * Talks to Google Places Nearby Search + Distance Matrix. Requires
 * GOOGLE_MAPS_API_KEY with Places API and Distance Matrix API enabled.
 * Every result comes from Google's Places index, so candidates are always
 * real, named venues rather than arbitrary street coordinates.
 */
export class GoogleMapsProvider implements LocationProvider {
  constructor(private apiKey: string) {}

  async findCandidateVenues(seed: { lat: number; lng: number }, radiusMeters: number): Promise<Venue[]> {
    const byId = new Map<string, Venue>();

    for (const type of PLACE_TYPES) {
      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.set("location", `${seed.lat},${seed.lng}`);
      url.searchParams.set("radius", String(Math.round(radiusMeters)));
      url.searchParams.set("type", type);
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString());
      const data = (await res.json()) as { results?: GooglePlace[]; status: string };
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Places API error (${type}): ${data.status}`);
      }

      for (const place of data.results ?? []) {
        if (byId.has(place.place_id)) continue;
        byId.set(place.place_id, {
          id: place.place_id,
          name: place.name,
          category: type,
          address: place.vicinity ?? "",
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
        });
      }
    }

    return Array.from(byId.values()).slice(0, 25);
  }

  async getTravelTimes(participants: Participant[], venues: Venue[]): Promise<TravelLeg[][]> {
    // Group participants by travel mode since Distance Matrix takes one mode per call.
    const byMode = new Map<string, number[]>();
    participants.forEach((p, idx) => {
      const mode = p.mode ?? "transit";
      byMode.set(mode, [...(byMode.get(mode) ?? []), idx]);
    });

    const legsPerVenue: TravelLeg[][] = venues.map(() => []);

    for (const [mode, indices] of byMode.entries()) {
      const origins = indices.map((i) => `${participants[i].lat},${participants[i].lng}`).join("|");
      const destinations = venues.map((v) => `${v.lat},${v.lng}`).join("|");

      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", origins);
      url.searchParams.set("destinations", destinations);
      url.searchParams.set("mode", mode);
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        rows: { elements: { status: string; duration?: { value: number } }[] }[];
        status: string;
      };
      if (data.status !== "OK") {
        throw new Error(`Distance Matrix API error: ${data.status}`);
      }

      data.rows.forEach((row, rowIdx) => {
        const participantIndex = indices[rowIdx];
        row.elements.forEach((el, venueIdx) => {
          const durationMinutes = el.status === "OK" && el.duration ? Math.round(el.duration.value / 60) : Infinity;
          legsPerVenue[venueIdx].push({ participantIndex, durationMinutes, mode: mode as any });
        });
      });
    }

    // Keep legs ordered by participant index for consistent downstream reads.
    legsPerVenue.forEach((legs) => legs.sort((a, b) => a.participantIndex - b.participantIndex));
    return legsPerVenue;
  }
}
