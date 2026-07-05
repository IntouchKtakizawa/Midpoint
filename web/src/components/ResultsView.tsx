import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { divIcon } from "leaflet";
import type { MeetupResult, ParticipantInput } from "../types";
import { colorForIndex, labelForIndex } from "../constants";

const CATEGORY_LABEL: Record<string, string> = {
  train_station: "🚆 Train station",
  subway_station: "🚇 Subway station",
  transit_station: "🚌 Transit hub",
  cafe: "☕ Cafe",
  restaurant: "🍽 Restaurant",
  bar: "🍺 Bar",
  park: "🌳 Park",
  library: "📚 Library",
  shopping_mall: "🛍 Shopping mall",
};

function pinIcon(color: string, label: string) {
  return divIcon({
    className: "pin-icon",
    html: `<div style="background:${color}" class="pin-dot">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface Props {
  result: MeetupResult;
  participants: ParticipantInput[];
  onBack: () => void;
}

export default function ResultsView({ result, participants, onBack }: Props) {
  if (result.venues.length === 0) {
    return (
      <div className="results-empty">
        <p>No venues found nearby. Try different locations.</p>
        <button className="link-button" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  const allLats = [...participants.map((p) => p.lat!), ...result.venues.map((v) => v.lat)];
  const allLngs = [...participants.map((p) => p.lng!), ...result.venues.map((v) => v.lng)];
  const center: [number, number] = [
    (Math.min(...allLats) + Math.max(...allLats)) / 2,
    (Math.min(...allLngs) + Math.max(...allLngs)) / 2,
  ];

  function openInMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  }

  return (
    <div className="results-view">
      <button className="link-button back-button" onClick={onBack}>
        ← New search
      </button>

      <MapContainer center={center} zoom={13} className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {participants.map((p, i) => (
          <Marker key={p.id} position={[p.lat!, p.lng!]} icon={pinIcon(colorForIndex(i), labelForIndex(i))}>
            <Popup>{p.name || `Person ${labelForIndex(i)}`}</Popup>
          </Marker>
        ))}
        {result.venues.map((v, i) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={pinIcon(i === 0 ? "#0f9d58" : "#e37400", String(i + 1))}
          >
            <Popup>
              {v.name} — {Math.round(v.maxMinutes)} min worst-case
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="venue-list">
        <h2>Best places to meet</h2>
        {result.venues.map((venue, i) => (
          <div className="venue-card" key={venue.id} onClick={() => openInMaps(venue.lat, venue.lng)}>
            <div className="venue-header">
              <span className="venue-rank">#{i + 1}</span>
              <div className="venue-title-block">
                <span className="venue-name">{venue.name}</span>
                <span className="venue-category">{CATEGORY_LABEL[venue.category] ?? venue.category}</span>
              </div>
              {venue.rating && <span className="venue-rating">★ {venue.rating.toFixed(1)}</span>}
            </div>
            <p className="venue-address">{venue.address}</p>
            <div className="leg-row">
              {venue.legs.map((leg) => (
                <span className="leg-chip" key={leg.participantIndex}>
                  {participants[leg.participantIndex]?.name || `Person ${labelForIndex(leg.participantIndex)}`}:{" "}
                  {leg.durationMinutes} min
                </span>
              ))}
            </div>
            <p className="venue-footer">
              Worst case {Math.round(venue.maxMinutes)} min · Avg {Math.round(venue.avgMinutes)} min
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
