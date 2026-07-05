import { divIcon } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { ParticipantInput } from "../types";
import { colorForIndex, labelForIndex } from "../constants";

const DEFAULT_CENTER: [number, number] = [40, -30];
const DEFAULT_ZOOM = 3;
const PIN_ZOOM = 13;

function pinIcon(color: string, label: string, isActive: boolean) {
  return divIcon({
    className: "pin-icon",
    html: `<div class="pin-dot${isActive ? " pin-dot-active" : ""}" style="background:${color}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToOnDemand({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 });
    }
  }, [target, map]);
  return null;
}

interface Props {
  participants: ParticipantInput[];
  activeParticipantId: string | null;
  flyTo: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  onDragPin: (id: string, lat: number, lng: number) => void;
}

export default function LocationPickerMap({ participants, activeParticipantId, flyTo, onPick, onDragPin }: Props) {
  const located = participants.filter((p) => p.lat !== null && p.lng !== null);
  const initialCenter: [number, number] =
    located.length > 0 ? [located[0].lat!, located[0].lng!] : DEFAULT_CENTER;
  const initialZoom = located.length > 0 ? PIN_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="picker-map-wrap">
      <MapContainer center={initialCenter} zoom={initialZoom} className="picker-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <FlyToOnDemand target={flyTo} />
        {participants.map((p, index) =>
          p.lat !== null && p.lng !== null ? (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={pinIcon(colorForIndex(index), labelForIndex(index), p.id === activeParticipantId)}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  onDragPin(p.id, pos.lat, pos.lng);
                },
              }}
            />
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
