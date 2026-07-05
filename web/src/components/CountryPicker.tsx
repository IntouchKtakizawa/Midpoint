import { useMemo, useState } from "react";
import { COUNTRIES } from "../countries";

interface Props {
  initialSelected: string[];
  onConfirm: (codes: string[]) => void;
}

export default function CountryPicker({ initialSelected, onConfirm }: Props) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [filter]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="country-picker-overlay">
      <div className="country-picker">
        <h1>🌍 Where are you searching?</h1>
        <p className="subtitle">
          Pick one or more countries to search in — this keeps landmark results relevant to where your group
          actually is.
        </p>

        <input
          type="text"
          className="country-filter"
          placeholder="Filter countries…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className="country-list">
          {filtered.map((c) => (
            <label key={c.code} className={`country-item ${selected.has(c.code) ? "country-item-selected" : ""}`}>
              <input type="checkbox" checked={selected.has(c.code)} onChange={() => toggle(c.code)} />
              {c.name}
            </label>
          ))}
          {filtered.length === 0 && <p className="country-empty">No countries match "{filter}"</p>}
        </div>

        <div className="country-picker-footer">
          <button type="button" className="link-button" onClick={() => onConfirm([])}>
            Search worldwide instead
          </button>
          <button
            type="button"
            className="submit-button country-continue"
            disabled={selected.size === 0}
            onClick={() => onConfirm(Array.from(selected))}
          >
            Continue{selected.size > 0 ? ` (${selected.size} selected)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
