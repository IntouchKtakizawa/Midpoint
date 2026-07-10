# Midpoint

Finds a real, convenient place for 2+ people to meet (train stations, cafes, parks, etc.), ranked by fairness of actual travel time — not just geographic distance.

## Try it live

The website is a static site (free on **GitHub Pages**) that talks to a small API (needs to actually run, so it's on **Render**'s free tier). Two platforms because Pages can't run server code — both are free, no credit card.

**Public site:** `https://intouchktakizawa.github.io/Midpoint/` (live once both steps below are done)

### One-time setup

1. **Backend** — click to deploy: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/IntouchKtakizawa/Midpoint). Sign in with GitHub, click "Apply". Render reads [`render.yaml`](render.yaml) and gives you a URL like `https://midpoint-server.onrender.com`.
2. **Frontend** — in this repo on GitHub: Settings → Pages → under "Build and deployment", set Source to **GitHub Actions**. That's it — [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds and publishes the site automatically on every push to `main`.

If your backend's actual URL differs from `https://midpoint-server.onrender.com` (Render adds a random suffix if that name's taken), set it once in this repo: Settings → Secrets and variables → Actions → Variables tab → add `VITE_API_URL` with your real backend URL → re-run the "Deploy website to GitHub Pages" workflow under the Actions tab.

A couple of things to know about the free tier:
- The backend spins down after 15 minutes of no traffic, so the first search after a quiet period takes ~30–50 seconds to respond. Totally normal, not a bug.
- The website itself (GitHub Pages) has no such delay — it's a static file, always instantly available.

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
