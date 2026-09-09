import { useState, useEffect } from "react";

export interface CompetitorStat {
  placeId: string;
  name: string;
  totalPoints: number;
  avgRank: number;
  top3Pct: number;
  top10Pct: number;
}

interface LeaderboardResponse {
  scanId: number;
  totalGridPoints: number;
  competitorCount: number;
  competitors: CompetitorStat[];
  status?: string;
}

type SortKey = "avgRank" | "top3Pct" | "totalPoints";

interface Props {
  scanId: number;
  trackedBusinessName: string;
}

export function CompetitorLeaderboard({ scanId, trackedBusinessName }: Props) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("avgRank");
  const [sortDir, setSortDir] = useState<1 | -1>(1); // 1=asc, -1=desc

  useEffect(() => {
    setIsLoading(true);
    fetch(`/scan/${scanId}/competitors`)
      .then((r) => r.json() as Promise<LeaderboardResponse>)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [scanId]);

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header"><h2>Competitor Leaderboard</h2></div>
        <div style={{ padding: 32, textAlign: "center" }}><span className="spinner" style={{ margin: "0 auto" }} /></div>
      </div>
    );
  }

  if (!data || data.competitors.length === 0) return null;

  // Normalize tracked business name for matching
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trackedNorm = normalize(trackedBusinessName);

  const trackedIndex = data.competitors.findIndex((c) => {
    const n = normalize(c.name);
    return n.includes(trackedNorm) || trackedNorm.includes(n);
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortBy(key); setSortDir(key === "avgRank" ? 1 : -1); }
  }

  const sorted = [...data.competitors].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return diff * sortDir;
  });

  function SortHeader({ label, key }: { label: string; key: SortKey }) {
    const active = sortBy === key;
    return (
      <th
        onClick={() => toggleSort(key)}
        style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: active ? "var(--color-navy)" : "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
      >
        {label} {active ? (sortDir === 1 ? "▲" : "▼") : ""}
      </th>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Competitor Leaderboard</h2>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {data.competitorCount} businesses · {data.totalGridPoints} grid points
          {trackedIndex >= 0 && (
            <span style={{ marginLeft: 10, color: "var(--color-accent)", fontWeight: 600 }}>
              You're #{trackedIndex + 1} of {data.competitorCount}
            </span>
          )}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 32 }}>#</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Business</th>
              <SortHeader label="Avg Rank" key="avgRank" />
              <SortHeader label="Top-3 %" key="top3Pct" />
              <SortHeader label="Visibility" key="totalPoints" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const isTracked = normalize(c.name).includes(trackedNorm) || trackedNorm.includes(normalize(c.name));
              const rankColor = c.avgRank <= 3 ? "var(--color-rank-good)" : c.avgRank <= 10 ? "var(--color-rank-mid)" : "var(--color-rank-poor)";
              return (
                <tr
                  key={c.placeId || c.name}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    background: isTracked ? "rgba(245,184,0,0.06)" : undefined,
                  }}
                >
                  <td style={{ padding: "8px 12px", color: "var(--color-text-muted)", fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: isTracked ? 700 : 400 }}>
                    {isTracked && <span style={{ color: "var(--color-accent)", marginRight: 6, fontSize: 11 }}>★ YOU</span>}
                    {c.name}
                  </td>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: rankColor }}>
                    {c.avgRank.toFixed(1)}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${c.top3Pct}%`, height: "100%", background: "var(--color-rank-good)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{c.top3Pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {c.totalPoints} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
