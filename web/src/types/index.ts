export type TravelMode = "transit" | "driving" | "walking" | "bicycling";

export interface ParticipantInput {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mode: TravelMode;
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

export interface TravelLeg {
  participantIndex: number;
  durationMinutes: number;
  mode: TravelMode;
}

export interface RankedVenue {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  legs: TravelLeg[];
  maxMinutes: number;
  avgMinutes: number;
  score: number;
}

export interface MeetupResult {
  seed: { lat: number; lng: number };
  venues: RankedVenue[];
}
