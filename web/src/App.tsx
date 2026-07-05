import { useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";
import MeetupForm from "./components/MeetupForm";
import ResultsView from "./components/ResultsView";
import CountryPicker from "./components/CountryPicker";
import { fetchMidpoint } from "./api/client";
import type { MeetupResult, ParticipantInput } from "./types";

const COUNTRIES_STORAGE_KEY = "midpoint_countries";

function loadSavedCountries(): string[] {
  try {
    const raw = localStorage.getItem(COUNTRIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: MeetupResult; participants: ParticipantInput[] } | null>(null);
  const [countries, setCountries] = useState<string[]>(loadSavedCountries);
  const [showCountryPicker, setShowCountryPicker] = useState(true);

  function handleConfirmCountries(codes: string[]) {
    setCountries(codes);
    localStorage.setItem(COUNTRIES_STORAGE_KEY, JSON.stringify(codes));
    setShowCountryPicker(false);
  }

  async function handleSubmit(participants: ParticipantInput[]) {
    setLoading(true);
    setError(null);
    try {
      const meetupResult = await fetchMidpoint(participants);
      setResult({ result: meetupResult, participants });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {showCountryPicker && <CountryPicker initialSelected={countries} onConfirm={handleConfirmCountries} />}

      {result ? (
        <ResultsView result={result.result} participants={result.participants} onBack={() => setResult(null)} />
      ) : (
        <>
          <div className="countries-bar">
            <span>
              Searching in:{" "}
              {countries.length > 0 ? `${countries.length} selected countr${countries.length === 1 ? "y" : "ies"}` : "worldwide"}
            </span>
            <button type="button" className="link-button" onClick={() => setShowCountryPicker(true)}>
              Change
            </button>
          </div>
          <MeetupForm loading={loading} onSubmit={handleSubmit} countryCodes={countries} />
          {error && <p className="error-text top-level-error">{error}</p>}
        </>
      )}

      <footer className="app-footer">Made by Intouch Kenta Takizawa</footer>
    </div>
  );
}
