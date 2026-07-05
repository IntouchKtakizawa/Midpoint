import { MeetupResult, ParticipantInput } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

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
