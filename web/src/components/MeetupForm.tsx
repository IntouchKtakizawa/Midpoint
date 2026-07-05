import { useRef, useState } from "react";
import type { ParticipantInput, TravelMode } from "../types";
import { colorForIndex, labelForIndex } from "../constants";
import { searchLandmarks, type LandmarkResult } from "../api/client";
import LocationPickerMap from "./LocationPickerMap";

const MODES: TravelMode[] = ["transit", "driving", "walking", "bicycling"];
const MODE_ICON: Record<TravelMode, string> = {
  transit: "🚆",
  driving: "🚗",
  walking: "🚶",
  bicycling: "🚴",
};
const SEARCH_DEBOUNCE_MS = 400;

function emptyParticipant(id: string): ParticipantInput {
  return { id, name: "", address: "", lat: null, lng: null, mode: "transit" };
}

function parseCoords(address: string): { lat: number; lng: number } | null {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

interface Props {
  loading: boolean;
  onSubmit: (participants: ParticipantInput[]) => void;
  countryCodes: string[];
}

export default function MeetupForm({ loading, onSubmit, countryCodes }: Props) {
  const [participants, setParticipants] = useState<ParticipantInput[]>([
    emptyParticipant("p1"),
    emptyParticipant("p2"),
  ]);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>("p1");
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [locatingId, setLocatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchParticipantId, setSearchParticipantId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<LandmarkResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  function updateParticipant(id: string, patch: Partial<ParticipantInput>) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addParticipant() {
    const id = `p${participants.length + 1}-${Date.now()}`;
    setParticipants((prev) => [...prev, emptyParticipant(id)]);
    setActiveParticipantId(id);
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => (prev.length <= 2 ? prev : prev.filter((p) => p.id !== id)));
    if (activeParticipantId === id) setActiveParticipantId(null);
    if (searchParticipantId === id) closeSearch();
  }

  function advanceToNextUnset(afterId: string) {
    setParticipants((current) => {
      const next = current.find((p) => p.id !== afterId && p.lat === null);
      setActiveParticipantId(next ? next.id : null);
      return current;
    });
  }

  function closeSearch() {
    setSearchParticipantId(null);
    setSearchResults([]);
    setSearching(false);
  }

  function handleMapPick(lat: number, lng: number) {
    const targetId = activeParticipantId ?? participants.find((p) => p.lat === null)?.id;
    if (!targetId) return;
    updateParticipant(targetId, { lat, lng, address: formatCoords(lat, lng) });
    closeSearch();
    advanceToNextUnset(targetId);
  }

  function handleDragPin(id: string, lat: number, lng: number) {
    updateParticipant(id, { lat, lng, address: formatCoords(lat, lng) });
  }

  function handleAddressChange(id: string, address: string) {
    updateParticipant(id, { address });
    setActiveParticipantId(id);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const coords = parseCoords(address);
    if (coords) {
      updateParticipant(id, { lat: coords.lat, lng: coords.lng });
      closeSearch();
      return;
    }

    if (address.trim().length < 3) {
      closeSearch();
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      setSearchParticipantId(id);
      const results = await searchLandmarks(address, countryCodes);
      setSearchResults(results);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSelectLandmark(id: string, result: LandmarkResult) {
    updateParticipant(id, { lat: result.lat, lng: result.lng, address: result.name });
    setFlyTo([result.lat, result.lng]);
    closeSearch();
    advanceToNextUnset(id);
  }

  function useCurrentLocation(id: string) {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.");
      return;
    }
    setLocatingId(id);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateParticipant(id, { lat: latitude, lng: longitude, address: formatCoords(latitude, longitude) });
        setFlyTo([latitude, longitude]);
        setLocatingId(null);
      },
      (err) => {
        setError(err.message);
        setLocatingId(null);
      }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = participants
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => p.lat === null || p.lng === null);
    if (missing.length > 0) {
      setError(
        `Set a location for: ${missing.map(({ p, index }) => p.name || `Person ${labelForIndex(index)}`).join(", ")}. Search a landmark, click the map, or tap "Use my location".`
      );
      return;
    }

    onSubmit(participants);
  }

  return (
    <form className="meetup-form" onSubmit={handleSubmit}>
      <h1>Who's meeting up?</h1>
      <p className="subtitle">
        {activeParticipantId
          ? "Search a landmark, or click the map, to set the highlighted person's location."
          : "Click a person below, then search or click the map to set their location."}
      </p>

      <LocationPickerMap
        participants={participants}
        activeParticipantId={activeParticipantId}
        flyTo={flyTo}
        onPick={handleMapPick}
        onDragPin={handleDragPin}
      />

      {participants.map((p, index) => (
        <div
          className={`participant-card ${activeParticipantId === p.id ? "participant-card-active" : ""}`}
          key={p.id}
          style={{ borderColor: activeParticipantId === p.id ? colorForIndex(index) : undefined }}
          onClick={() => {
            setActiveParticipantId(p.id);
            closeSearch();
          }}
        >
          <div className="participant-header">
            <span className="participant-badge" style={{ background: colorForIndex(index) }}>
              {labelForIndex(index)}
            </span>
            <span className="participant-title">Person {labelForIndex(index)}</span>
            {participants.length > 2 && (
              <button
                type="button"
                className="link-button danger"
                onClick={(e) => {
                  e.stopPropagation();
                  removeParticipant(p.id);
                }}
              >
                Remove
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Name (optional)"
            value={p.name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
          />

          <div className="search-field" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Search a landmark (e.g. Shibuya Station), or type lat, lng"
              value={p.address}
              onChange={(e) => handleAddressChange(p.id, e.target.value)}
              onFocus={() => setActiveParticipantId(p.id)}
              autoComplete="off"
            />
            {searchParticipantId === p.id && (
              <div className="search-dropdown">
                {searching && <div className="search-item search-item-loading">Searching…</div>}
                {!searching &&
                  searchResults.map((result, i) => (
                    <button
                      type="button"
                      key={`${result.lat}-${result.lng}-${i}`}
                      className="search-item"
                      onClick={() => handleSelectLandmark(p.id, result)}
                    >
                      <span className="search-item-name">{result.name}</span>
                      <span className="search-item-detail">{result.displayName}</span>
                    </button>
                  ))}
                {!searching && searchResults.length === 0 && (
                  <div className="search-item search-item-empty">No matches found</div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="locate-button"
            onClick={(e) => {
              e.stopPropagation();
              useCurrentLocation(p.id);
            }}
            disabled={locatingId === p.id}
          >
            {locatingId === p.id ? "Locating…" : "📍 Use my location"}
          </button>

          <div className="mode-row">
            {MODES.map((mode) => (
              <button
                type="button"
                key={mode}
                className={`mode-chip ${p.mode === mode ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  updateParticipant(p.id, { mode });
                }}
              >
                {MODE_ICON[mode]} {mode}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button type="button" className="link-button" onClick={addParticipant}>
        + Add another person
      </button>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? "Finding…" : "Find Midpoint"}
      </button>
    </form>
  );
}
