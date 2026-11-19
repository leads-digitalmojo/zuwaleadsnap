import { useState, useEffect } from "react";
import { Pagination } from "./Pagination";
import { IconChevronUp, IconChevronDown, IconStar, IconRefresh, IconSearch } from "./Icons";
import { useAuth } from "../context/AuthContext";
import type { CompetitorStat } from "../types";
export type { CompetitorStat };

interface LeaderboardResponse {
  scanId: number;
  totalGridPoints: number;
  competitorCount: number;
  competitors: CompetitorStat[];
  status?: string;
}

type SortKey = "avgRank" | "atgr" | "top3Pct" | "top10Pct" | "totalPoints";

interface Props {
  scanId: number;
  trackedBusinessName: string;
  activeCompetitor?: CompetitorStat | null;
  onSelectCompetitor?: (c: CompetitorStat | null) => void;
}

export function CompetitorLeaderboard({
  scanId,
  trackedBusinessName,
  activeCompetitor,
  onSelectCompetitor,
}: Props) {
  const { authFetch } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("atgr");
  const [sortDir, setSortDir] = useState<1 | -1>(1); // 1=asc, -1=desc
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    authFetch(`/scan/${scanId}/competitors`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as LeaderboardResponse;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [scanId, authFetch]);

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        <span className="spinner" style={{ margin: "0 auto 8px" }} />
        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Analyzing competitor geo-rankings…</div>
      </div>
    );
  }

  if (!data || !data.competitors || !Array.isArray(data.competitors) || data.competitors.length === 0) {
    return null;
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trackedNorm = normalize(trackedBusinessName);

  const trackedIndex = data.competitors.findIndex((c) => {
    const n = normalize(c.name);
    return n.includes(trackedNorm) || trackedNorm.includes(n);
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortBy(key);
      setSortDir(key === "avgRank" || key === "atgr" ? 1 : -1);
    }
  }

  // Filter by search query
  const filtered = data.competitors.filter((c) =>
    searchQuery.trim() === "" ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const diff = (a[sortBy] ?? 99) - (b[sortBy] ?? 99);
    return diff * sortDir;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function SortHeader({ label, sortKey, width }: { label: string; sortKey: SortKey; width?: number | string }) {
    const active = sortBy === sortKey;
    return (
      <th
        onClick={() => toggleSort(sortKey)}
        style={{
          padding: "8px 10px",
          textAlign: "left",
          borderBottom: "2px solid var(--hairline)",
          fontSize: 11,
          fontWeight: 700,
          color: active ? "var(--ink)" : "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          cursor: "pointer",
          whiteSpace: "nowrap",
          userSelect: "none",
          width,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <span>{label}</span>
          {active && (sortDir === 1 ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />)}
        </span>
      </th>
    );
  }

  return (
    <div className="card competitor-leaderboard-card" style={{ overflow: "hidden" }}>
      {/* Header with Title and Search Filter */}
      <div
        className="card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700, color: "var(--ink)" }}>
            Competitor Intelligence & Leaderboard
          </h2>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
            {data.competitorCount} businesses ranked · {data.totalGridPoints} geo-grid coordinates
            {trackedIndex >= 0 && (
              <span style={{ marginLeft: 8, color: "var(--gold-deep)", fontWeight: 700 }}>
                (You rank #{trackedIndex + 1} overall)
              </span>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div style={{ position: "relative", minWidth: 200 }}>
          <input
            type="text"
            placeholder="Filter competitors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "5px 10px 5px 28px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--hairline)",
              background: "var(--surface)",
              width: "100%",
            }}
          />
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)" }}>
            <IconSearch size={13} />
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--canvas)" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", width: 32, fontSize: 11, color: "var(--ink-muted)" }}>#</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase" }}>Competitor Business</th>
              <SortHeader label="AGR" sortKey="avgRank" width={70} />
              <SortHeader label="ATGR" sortKey="atgr" width={70} />
              <SortHeader label="Top 3%" sortKey="top3Pct" width={90} />
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase" }}>Found In</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase" }}>Quadrants (NW·NE·SW·SE)</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", width: 90 }}>Flip Grid</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c, i) => {
              const globalIndex = (page - 1) * pageSize + i + 1;
              const isTracked = normalize(c.name).includes(trackedNorm) || trackedNorm.includes(normalize(c.name));
              const isFlipped = activeCompetitor?.placeId === c.placeId || (activeCompetitor && activeCompetitor.name === c.name);

              const agrColor = c.avgRank <= 3 ? "var(--color-rank-good)" : c.avgRank <= 10 ? "var(--gold-deep)" : "var(--color-rank-poor)";
              const atgrColor = c.atgr <= 5 ? "var(--color-rank-good)" : c.atgr <= 12 ? "var(--gold-deep)" : "var(--ink)";

              return (
                <tr
                  key={c.placeId || c.name}
                  style={{
                    borderBottom: "1px solid var(--hairline)",
                    background: isFlipped
                      ? "rgba(240,188,0,0.12)"
                      : isTracked
                      ? "rgba(240,188,0,0.04)"
                      : undefined,
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "8px 10px", color: "var(--ink-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {globalIndex}
                  </td>

                  {/* Business Name & Metadata */}
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isTracked && (
                        <span
                          style={{
                            background: "var(--gold-tint)",
                            color: "var(--gold-deep)",
                            border: "1px solid #ebd48f",
                            borderRadius: 4,
                            padding: "1px 5px",
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          YOU
                        </span>
                      )}
                      <span style={{ fontWeight: isTracked || isFlipped ? 700 : 500, color: "var(--ink)" }}>
                        {c.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                      {c.rating != null && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <IconStar size={10} style={{ color: "var(--gold-deep)" }} />
                          <span>{c.rating} ({c.reviews ?? 0})</span>
                        </span>
                      )}
                      {c.category && <span>&middot; {c.category}</span>}
                    </div>
                  </td>

                  {/* AGR */}
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: agrColor, fontFamily: "var(--font-mono)" }}>
                    {c.avgRank.toFixed(1)}
                  </td>

                  {/* ATGR */}
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: atgrColor, fontFamily: "var(--font-mono)" }}>
                    {c.atgr.toFixed(1)}
                  </td>

                  {/* Top-3 % */}
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 44, height: 5, background: "var(--hairline)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, c.top3Pct)}%`, height: "100%", background: "var(--color-rank-good)" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>{c.top3Pct}%</span>
                    </div>
                  </td>

                  {/* Found In */}
                  <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                    {c.foundIn || `${c.totalPoints} pts`}
                  </td>

                  {/* Regional Quadrants */}
                  <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                    {c.northWest ?? "–"} · {c.northEast ?? "–"} · {c.southWest ?? "–"} · {c.southEast ?? "–"}
                  </td>

                  {/* 1-Click Flip Grid Button */}
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {onSelectCompetitor && (
                      <button
                        onClick={() => onSelectCompetitor(isFlipped ? null : c)}
                        className={isFlipped ? "btn-primary" : "btn-secondary"}
                        style={{
                          fontSize: 10,
                          padding: "4px 8px",
                          fontWeight: 700,
                          borderRadius: 4,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isFlipped ? "✕ Reset" : "Flip Map"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={sorted.length}
          limit={pageSize}
          onPageChange={setPage}
          itemName="competitors"
        />
      )}
    </div>
  );
}
