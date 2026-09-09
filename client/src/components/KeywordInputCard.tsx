import { useState, useEffect } from "react";
import type { KeywordMetrics, KeywordList } from "../types";

interface Props {
  businessName: string;
  keywords: string[];
  onChange: (kws: string[]) => void;
}

interface SuggestResponse {
  keywords?: string[];
  error?: string;
}

interface VolumeResponse {
  metrics?: KeywordMetrics[];
  error?: string;
}

interface ListsResponse {
  lists?: KeywordList[];
}

function MetricBadge({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <span className="metric-badge" title={label}>
      {value}
    </span>
  );
}

function fmtVol(v: number | null): string | null {
  if (v === null) return null;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k/mo`;
  return `${v}/mo`;
}

function fmtComp(c: number | null): string | null {
  if (c === null) return null;
  const pct = Math.round(c * 100);
  const label = pct < 33 ? "Low" : pct < 66 ? "Med" : "High";
  return `${label} comp`;
}

function fmtCpc(c: number | null): string | null {
  if (c === null) return null;
  return `$${c.toFixed(2)} CPC`;
}

export function KeywordInputCard({ businessName, keywords, onChange }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTriggered, setAiTriggered] = useState(false);

  const [metrics, setMetrics] = useState<Map<string, KeywordMetrics>>(new Map());
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const [savedLists, setSavedLists] = useState<KeywordList[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [listName, setListName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Fetch keyword volume whenever keywords change
  useEffect(() => {
    if (keywords.length === 0) return;
    const missing = keywords.filter((k) => !metrics.has(k));
    if (missing.length === 0) return;

    setIsLoadingMetrics(true);
    fetch("/api/keywords/volume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: missing }),
    })
      .then((r) => r.json() as Promise<VolumeResponse>)
      .then((data) => {
        if (data.metrics) {
          setMetrics((prev) => {
            const next = new Map(prev);
            data.metrics!.forEach((m) => next.set(m.keyword, m));
            return next;
          });
        }
      })
      .catch(() => {/* silently ignore */})
      .finally(() => setIsLoadingMetrics(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords]);

  // Load saved keyword lists on mount
  useEffect(() => {
    fetch("/api/keyword-lists")
      .then((r) => r.json() as Promise<ListsResponse>)
      .then((d) => setSavedLists(d.lists ?? []))
      .catch(() => {/* ignore */});
  }, []);

  function addKeyword(kw: string) {
    const trimmed = kw.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) return;
    onChange([...keywords, trimmed]);
  }

  function removeKeyword(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
    setMetrics((prev) => { const next = new Map(prev); next.delete(kw); return next; });
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  }

  async function fetchAISuggestions() {
    if (!businessName.trim()) return;
    setIsLoadingAI(true);
    setAiError(null);
    setAiTriggered(true);
    try {
      const res = await fetch("/api/suggest-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      const data = (await res.json()) as SuggestResponse;
      if (!res.ok) { setAiError(data.error ?? "Failed"); return; }
      setSuggestions(data.keywords ?? []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoadingAI(false);
    }
  }

  async function saveList() {
    if (!listName.trim() || keywords.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/keyword-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName.trim(), keywords }),
      });
      const data = (await res.json()) as KeywordList & { error?: string };
      if (res.ok) {
        setSavedLists((prev) => [{ ...data, businessId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
        setListName("");
        setShowSaveForm(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function loadList(list: KeywordList) {
    onChange(list.keywords);
    setMetrics(new Map()); // clear old metrics, will re-fetch
  }

  async function deleteList(id: number) {
    await fetch(`/api/keyword-lists/${id}`, { method: "DELETE" });
    setSavedLists((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <span className="step-badge">2</span>
          Keywords
          {isLoadingMetrics && <span className="spinner" style={{ marginLeft: 8, width: 12, height: 12, borderWidth: 2 }} />}
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedLists.length > 0 && (
            <select
              className="select-input"
              style={{ fontSize: 12, padding: "5px 28px 5px 8px" }}
              value=""
              onChange={(e) => {
                const list = savedLists.find((l) => String(l.id) === e.target.value);
                if (list) loadList(list);
              }}
            >
              <option value="">Load list…</option>
              {savedLists.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.keywords.length} kws)</option>
              ))}
            </select>
          )}
          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => setShowSaveForm((s) => !s)}
            disabled={keywords.length === 0}
            title="Save current keywords as a list"
          >
            Save list
          </button>
          <button
            className="btn-secondary"
            onClick={() => void fetchAISuggestions()}
            disabled={isLoadingAI || !businessName.trim()}
            title={!businessName.trim() ? "Select a business first" : "Get AI keyword suggestions"}
          >
            {isLoadingAI ? <><span className="spinner" style={{ marginRight: 6 }} />Thinking…</> : "✦ AI Suggest"}
          </button>
        </div>
      </div>

      <div className="card-body">
        {showSaveForm && (
          <div className="save-list-form">
            <input
              className="text-input"
              type="text"
              placeholder="List name…"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void saveList()}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn-secondary" onClick={() => void saveList()} disabled={isSaving || !listName.trim()}>
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button className="btn-secondary" onClick={() => setShowSaveForm(false)}>Cancel</button>
          </div>
        )}

        {savedLists.length > 0 && showSaveForm === false && (
          <div className="saved-lists-row">
            {savedLists.slice(0, 4).map((l) => (
              <span key={l.id} className="saved-list-chip">
                <button onClick={() => loadList(l)} title="Load this list">{l.name}</button>
                <button className="chip-remove" onClick={() => void deleteList(l.id)} title="Delete list">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="keyword-chips">
          {keywords.map((kw) => {
            const m = metrics.get(kw);
            return (
              <span key={kw} className="chip chip-with-metrics">
                <span className="chip-label">{kw}</span>
                {m && (
                  <span className="chip-metrics">
                    <MetricBadge label="Monthly searches" value={fmtVol(m.searchVolume)} />
                    <MetricBadge label="Competition" value={fmtComp(m.competition)} />
                    <MetricBadge label="Cost per click" value={fmtCpc(m.cpc)} />
                  </span>
                )}
                <button className="chip-remove" onClick={() => removeKeyword(kw)}>×</button>
              </span>
            );
          })}
        </div>

        <div className="keyword-add-row">
          <input
            className="text-input"
            type="text"
            placeholder="Type a keyword and press Enter…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button className="btn-secondary" onClick={() => { addKeyword(input); setInput(""); }} disabled={!input.trim()}>
            Add
          </button>
        </div>

        {aiTriggered && (
          <div className="ai-panel">
            <div className="ai-panel-header">
              <span className="ai-badge">✦ AI</span>
              <span>
                {isLoadingAI ? "Generating suggestions…" : suggestions.length > 0 ? "Click to add" : aiError ? "Unavailable" : "No suggestions"}
              </span>
            </div>
            {isLoadingAI && <p className="ai-loading">Asking Claude for keyword ideas…</p>}
            {aiError && <p className="ai-error">{aiError}</p>}
            {!isLoadingAI && !aiError && suggestions.length > 0 && (
              <div className="ai-suggestions">
                {suggestions.map((s) => {
                  const already = keywords.includes(s.toLowerCase());
                  return (
                    <button key={s} className={`ai-suggestion-chip${already ? " added" : ""}`} onClick={() => !already && addKeyword(s)} disabled={already}>
                      {already ? "✓ " : "+ "}{s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
