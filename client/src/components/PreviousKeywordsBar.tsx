import { useEffect, useState } from "react";
import type { Business } from "../types";
import { useAuth } from "../context/AuthContext";

interface KeywordEntry {
  keyword: string;
  scanId: number;
  createdAt: string;
  totalPoints: number;
  rankedPoints: number;
}

interface Props {
  business: Business;
  activeScanId: number | null;
  onSelect: (scanId: number, keyword: string) => void;
}

export function PreviousKeywordsBar({ business, activeScanId, onSelect }: Props) {
  const { authFetch } = useAuth();
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (business.placeId) params.set("placeId", business.placeId);
    else params.set("name", business.name);

    authFetch(`/api/business-keywords?${params}`)
      .then((r) => r.json())
      .then((d: { keywords: KeywordEntry[] }) => setKeywords(d.keywords ?? []))
      .catch(() => setKeywords([]));
  }, [business.placeId, business.name, authFetch]);

  if (keywords.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Previous Scans</h2>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>
          Click a keyword to load its most recent results instantly.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {keywords.map((k) => {
            const isActive = k.scanId === activeScanId;
            return (
              <button
                key={k.keyword}
                onClick={() => onSelect(k.scanId, k.keyword)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: isActive ? "2px solid var(--color-navy)" : "2px solid var(--color-border)",
                  background: isActive ? "var(--color-navy)" : "#fff",
                  color: isActive ? "#fff" : "var(--color-text)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {k.keyword}
                <span style={{
                  fontSize: 11,
                  opacity: 0.7,
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--color-bg-alt)",
                  borderRadius: 10,
                  padding: "1px 6px",
                }}>
                  {k.rankedPoints}/{k.totalPoints}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
