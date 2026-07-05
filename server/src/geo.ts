const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function destinationPoint(
  origin: { lat: number; lng: number },
  bearingDeg: number,
  distanceMeters: number
): { lat: number; lng: number } {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_M;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

// Rough average speeds used to estimate an ETA from straight-line distance
// when no real routing data is available (e.g. transit, which has no free
// public routing API).
const MODE_SPEED_KMH: Record<string, number> = {
  transit: 22,
  driving: 35,
  walking: 5,
  bicycling: 15,
};

export function estimateDurationMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  mode: string
): number {
  const distanceKm = haversineMeters(a, b) / 1000;
  const speed = MODE_SPEED_KMH[mode] ?? MODE_SPEED_KMH.transit;
  // +6 min fixed overhead to mimic walking to/from stops, waiting, etc.
  return Math.round((distanceKm / speed) * 60 + 6);
}
