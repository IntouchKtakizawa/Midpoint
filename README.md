# Midpoint

Finds a real, convenient place for 2+ people to meet (train stations, cafes, parks, etc.), ranked by fairness of actual travel time — not just geographic distance.

Public link : https://midpoint-az3j7c1pd-airvex.vercel.app/

## Structure

- `server/` — Node/Express API. Finds real venues and travel times using free OpenStreetMap-based services (Overpass, OSRM, Nominatim) by default; can optionally use Google Maps Platform.
- `web/` — React + Vite website. Pick countries to search in, drop pins or search landmarks on a map, get ranked meeting spots.
- `app/` — Expo (React Native) mobile app for iOS/Android, same features as the website.

## Running it

You'll need [Node.js](https://nodejs.org) installed (v20+; this project was built with v24).

### 1. Backend (required by both the website and the app)

```
cd server
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:4000`. Defaults to the free `osm` provider — no API key needed.

### 2. Website

```
cd web
npm install
cp .env.example .env
npm run dev
```

Opens at `http://localhost:5173`.

### 3. Mobile app (optional)

```
cd app
npm install
cp .env.example .env
npx expo start
```

Scan the QR code with the Expo Go app on your phone. Edit `.env` to point `EXPO_PUBLIC_API_URL` at your computer's LAN IP (not `localhost`) so your phone can reach the backend.

## Switching to Google Maps Platform (optional, paid)

By default everything runs on free services. If you get a Google Maps Platform API key (Places API + Distance Matrix API enabled), set in `server/.env`:

```
PROVIDER=google
GOOGLE_MAPS_API_KEY=your-key-here
```
