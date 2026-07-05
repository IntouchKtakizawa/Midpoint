import { LocationProvider, Participant, TravelLeg, Venue, VenueCategory } from "../types";
import { estimateDurationMinutes } from "../geo";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OSRM_URL = "https://router.project-osrm.org";
// Identifies this app to the free public services per their usage policies.
const USER_AGENT = "MidpointMeetupApp/1.0 (personal project, no API key needed)";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function categoryFromTags(tags: Record<string, string>): VenueCategory | null {
  if (tags.railway === "station" || tags.railway === "halt") return "train_station";
  if (tags.amenity === "bus_station" || tags.public_transport === "station") return "transit_station";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "bar";
  if (tags.amenity === "library") return "library";
  if (tags.leisure === "park") return "park";
  if (tags.shop === "mall") return "shopping_mall";
  return null;
}

function addressFromTags(tags: Record<string, string>): string {
  const parts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : tags["addr:full"] ?? "";
}

/**
 * Finds real, named venues and estimates travel time using entirely free
 * services: Overpass (OpenStreetMap POI data) for venues, and OSRM's public
 * demo server for real road-network driving times. Other modes (transit,
 * walking, bicycling) fall back to a distance-based estimate since there's
 * no free public transit-routing API.
 */
export class OsmProvider implements LocationProvider {
  async findCandidateVenues(seed: { lat: number; lng: number }, radiusMeters: number): Promise<Venue[]> {
    const radius = Math.round(radiusMeters);
    const query = `
      [out:json][timeout:25];
      (
        nwr["railway"="station"](around:${radius},${seed.lat},${seed.lng});
        nwr["railway"="halt"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="bus_station"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="cafe"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="restaurant"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="bar"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="pub"](around:${radius},${seed.lat},${seed.lng});
        nwr["amenity"="library"](around:${radius},${seed.lat},${seed.lng});
        nwr["leisure"="park"](around:${radius},${seed.lat},${seed.lng});
        nwr["shop"="mall"](around:${radius},${seed.lat},${seed.lng});
      );
      out center 80;
    `;

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      throw new Error(`Overpass API error: ${res.status}`);
    }
    const data = (await res.json()) as { elements: OverpassElement[] };

    const venues: Venue[] = [];
    for (const el of data.elements) {
      const tags = el.tags ?? {};
      const name = tags.name;
      if (!name) continue;
      const category = categoryFromTags(tags);
      if (!category) continue;
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat === undefined || lng === undefined) continue;

      venues.push({
        id: `${el.type}/${el.id}`,
        name,
        category,
        address: addressFromTags(tags),
        lat,
        lng,
      });
    }
    return venues.slice(0, 30);
  }

  async getTravelTimes(participants: Participant[], venues: Venue[]): Promise<TravelLeg[][]> {
    const legsPerVenue: TravelLeg[][] = venues.map(() => []);

    const byMode = new Map<string, number[]>();
    participants.forEach((p, idx) => {
      const mode = p.mode ?? "transit";
      byMode.set(mode, [...(byMode.get(mode) ?? []), idx]);
    });

    for (const [mode, indices] of byMode.entries()) {
      let matrix: (number | null)[][] | null = null;
      if (mode === "driving") {
        matrix = await this.fetchDrivingMatrix(
          indices.map((i) => participants[i]),
          venues
        );
      }

      indices.forEach((participantIndex, sourceIdx) => {
        venues.forEach((venue, venueIdx) => {
          const seconds = matrix?.[sourceIdx]?.[venueIdx];
          const durationMinutes =
            seconds != null ? Math.round(seconds / 60) : estimateDurationMinutes(participants[participantIndex], venue, mode);
          legsPerVenue[venueIdx].push({ participantIndex, durationMinutes, mode: mode as any });
        });
      });
    }

    legsPerVenue.forEach((legs) => legs.sort((a, b) => a.participantIndex - b.participantIndex));
    return legsPerVenue;
  }

  // OSRM's free public demo server only reliably serves the "driving"
  // profile; walking/cycling/transit use the distance-based estimate instead.
  private async fetchDrivingMatrix(sources: Participant[], venues: Venue[]): Promise<(number | null)[][] | null> {
    try {
      const coords = [...sources, ...venues].map((p) => `${p.lng},${p.lat}`).join(";");
      const sourceIdx = sources.map((_, i) => i).join(";");
      const destIdx = venues.map((_, i) => sources.length + i).join(";");
      const url = `${OSRM_URL}/table/v1/driving/${coords}?sources=${sourceIdx}&destinations=${destIdx}`;

      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) return null;
      const data = (await res.json()) as { code: string; durations: (number | null)[][] };
      if (data.code !== "Ok") return null;
      return data.durations;
    } catch {
      return null;
    }
  }
}
