import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { findMidpoint } from "./midpoint";
import { GoogleMapsProvider } from "./providers/googleMaps";
import { MockProvider } from "./providers/mockProvider";
import { OsmProvider } from "./providers/osmProvider";
import { LocationProvider } from "./types";

const PORT = Number(process.env.PORT ?? 4000);
// "osm" (default): free, real venues + real driving times via OpenStreetMap/OSRM.
// "google": requires GOOGLE_MAPS_API_KEY and billing.
// "mock": fully fake fixture data, no network calls at all.
const PROVIDER = process.env.PROVIDER ?? "osm";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "MidpointMeetupApp/1.0 (personal project, no API key needed)";

function buildProvider(): LocationProvider {
  if (PROVIDER === "mock") return new MockProvider();
  if (PROVIDER === "google") {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is required when PROVIDER=google");
    }
    return new GoogleMapsProvider(apiKey);
  }
  return new OsmProvider();
}

const provider = buildProvider();

const participantSchema = z.object({
  name: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  mode: z.enum(["transit", "driving", "walking", "bicycling"]).optional(),
});

const meetupRequestSchema = z.object({
  participants: z.array(participantSchema).min(2, "At least 2 participants are required"),
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: PROVIDER });
});

app.post("/api/meetup", async (req, res) => {
  const parsed = meetupRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await findMidpoint(parsed.data.participants, provider);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.get("/api/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const countries = typeof req.query.countries === "string" ? req.query.countries.trim() : "";

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    if (countries) {
      url.searchParams.set("countrycodes", countries);
    }

    const nominatimRes = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
    if (!nominatimRes.ok) {
      throw new Error(`Nominatim error: ${nominatimRes.status}`);
    }
    const data = (await nominatimRes.json()) as { display_name: string; lat: string; lon: string }[];
    res.json({
      results: data.map((r) => ({
        name: r.display_name.split(",")[0],
        displayName: r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.listen(PORT, () => {
  console.log(`Midpoint server listening on http://localhost:${PORT} (provider=${PROVIDER})`);
});
