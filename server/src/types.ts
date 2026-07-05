export type TravelMode = "transit" | "driving" | "walking" | "bicycling";

export interface Participant {
  name?: string;
  lat: number;
  lng: number;
  mode?: TravelMode;
}

export type VenueCategory =
  | "train_station"
  | "subway_station"
  | "transit_station"
  | "cafe"
  | "restaurant"
  | "bar"
  | "park"
  | "library"
  | "shopping_mall";

export interface Venue {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
}

export interface TravelLeg {
  participantIndex: number;
  durationMinutes: number;
  mode: TravelMode;
}

export interface RankedVenue extends Venue {
  legs: TravelLeg[];
  maxMinutes: number;
  avgMinutes: number;
  score: number;
}

/**
 * A LocationProvider supplies real-world venue candidates and travel times.
 * GoogleMapsProvider and MockProvider both implement this so the ranking
 * algorithm never needs to know which one is active.
 */
export interface LocationProvider {
  findCandidateVenues(seed: { lat: number; lng: number }, radiusMeters: number): Promise<Venue[]>;
  getTravelTimes(participants: Participant[], venues: Venue[]): Promise<TravelLeg[][]>;
}
