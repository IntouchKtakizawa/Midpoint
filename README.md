# Midpoint

Finds a real, convenient place for 2+ people to meet (train stations, cafes, parks, etc.), ranked by fairness of actual travel time — not just geographic distance.

## Try it live

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/IntouchKtakizawa/Midpoint)

One click deploys both the website and its backend to [Render](https://render.com)'s free tier — no credit card required. Sign in with your GitHub account, click "Apply", and Render reads [`render.yaml`](render.yaml) to set everything up automatically. You'll get a public link like `https://midpoint-web.onrender.com` you can share with anyone.

A couple of things to know about the free tier:
- Both services spin down after 15 minutes of no traffic, so the first visit after a quiet period takes ~30–50 seconds to wake up. Totally normal, not a bug.
- If the name `midpoint-server` is already taken by someone else's Render deploy, Render will pick a variant name for your backend (e.g. `midpoint-server-ab12`). If the site loads but searches don't work, open the `midpoint-web` service in your Render dashboard → Environment → update `VITE_API_URL` to your actual backend URL → Manual Deploy.

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
