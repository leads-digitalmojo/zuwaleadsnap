import { useState, useEffect, useRef, useCallback } from "react";
import type { Business } from "../types";

interface Props {
  selected: Business | null;
  onSelect: (b: Business | null) => void;
}

interface PlacesResponse {
  places: Business[];
  error?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function BusinessSearchCard({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 350);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as PlacesResponse;
      if (data.places.length === 0 && !data.error) {
        setNoKey(true);
      } else {
        setNoKey(false);
      }
      setResults(data.places);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) void search(debouncedQuery);
  }, [debouncedQuery, selected, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(b: Business) {
    onSelect(b);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  }

  function handleManualEntry() {
    if (!query.trim()) return;
    onSelect({
      placeId: "",
      name: query.trim(),
      address: "",
      lat: null,
      lng: null,
      rating: null,
      reviewCount: null,
    });
    setQuery("");
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleManualEntry();
    if (e.key === "Escape") { setShowDropdown(false); }
  }

  function renderStars(rating: number) {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <span className="step-badge">1</span>
          Business
        </h2>
      </div>
      <div className="card-body">
        {!selected ? (
          <div ref={wrapperRef} className="search-wrapper">
            <label className="field-label" htmlFor="biz-search">Business name</label>
            <div style={{ position: "relative" }}>
              <input
                id="biz-search"
                className="text-input"
                type="text"
                placeholder="e.g. Radiant Plumbing & Air Conditioning"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                autoComplete="off"
              />
              {isLoading && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <span className="spinner" />
                </span>
              )}
            </div>

            {noKey && query.length >= 2 && (
              <div className="no-key-notice">
                ⚠ Google Places API key not configured — type the business name and press Enter to continue manually.
              </div>
            )}

            {showDropdown && results.length > 0 && (
              <div className="search-results-dropdown">
                {results.map((b) => (
                  <div key={b.placeId} className="search-result-item" onClick={() => handleSelect(b)}>
                    <div className="result-name">{b.name}</div>
                    <div className="result-addr">{b.address}</div>
                    {b.rating != null && (
                      <div className="result-rating">
                        <span className="stars">{renderStars(b.rating)}</span>{" "}
                        {b.rating} ({b.reviewCount?.toLocaleString()} reviews)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="selected-business-card">
            <div className="business-avatar">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <div className="business-info">
              <div className="biz-name">{selected.name}</div>
              {selected.address && <div className="biz-addr">{selected.address}</div>}
              <div className="biz-meta">
                {selected.rating != null && (
                  <span><span className="stars">★</span> {selected.rating}</span>
                )}
                {selected.reviewCount != null && (
                  <span>{selected.reviewCount.toLocaleString()} reviews</span>
                )}
                {selected.placeId && (
                  <span style={{ opacity: 0.6 }}>Place ID matched</span>
                )}
              </div>
            </div>
            <button className="btn-clear" onClick={() => onSelect(null)} title="Clear">×</button>
          </div>
        )}
      </div>
    </div>
  );
}
