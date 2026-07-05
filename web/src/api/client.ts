import type { MeetupResult, ParticipantInput } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function fetchMidpoint(participants: ParticipantInput[]): Promise<MeetupResult> {
  const res = await fetch(`${API_URL}/api/meetup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participants: participants.map((p) => ({
        name: p.name || undefined,
        lat: p.lat,
        lng: p.lng,
        mode: p.mode,
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.formErrors?.[0] ?? body.error ?? `Request failed (${res.status})`);
  }

  return res.json();
}

export interface LandmarkResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

export async function searchLandmarks(query: string, countryCodes: string[] = []): Promise<LandmarkResult[]> {
  const params = new URLSearchParams({ q: query });
  if (countryCodes.length > 0) {
    params.set("countries", countryCodes.join(","));
  }
  const res = await fetch(`${API_URL}/api/search?${params.toString()}`);
  if (!res.ok) return [];
  const body = await res.json();
  return body.results ?? [];
}
