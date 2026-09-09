import { useState, useEffect, useCallback } from "react";
import { ScanResultsMap } from "../components/ScanResultsMap";
import { CompetitorLeaderboard } from "../components/CompetitorLeaderboard";
import { ExportBar } from "../components/ExportBar";
import type { ScanListItem, ScanResponse } from "../types";

interface HistoryResponse {
  total: number;
  scans: ScanListItem[];
}

function statusBadge(s: string) {
  const color = s === "complete" ? "var(--color-rank-good)" : s === "error" ? "var(--color-rank-poor)" : "var(--color-rank-mid)";
  return <span style={{ color, fontWeight: 600, fontSize: 11 }}>{s}</span>;
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function HistoryPage() {
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewScan, setViewScan] = useState<ScanResponse | null>(null);
  const [compareScan, setCompareScan] = useState<ScanResponse | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const loadHistory = useCallback(async (q = "") => {
    setIsLoading(true);
    try {
      const url = q ? `/api/scans?business=${encodeURIComponent(q)}` : "/api/scans";
      const res = await fetch(url);
      const data = (await res.json()) as HistoryResponse;
      setScans(data.scans ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function openScan(id: number, slot: "main" | "compare") {
    setLoadingId(id);
    try {
      const res = await fetch(`/scan/${id}`);
      const data = (await res.json()) as ScanResponse;
      if (slot === "main") {
        setViewScan(data);
        setCompareScan(null);
        setCompareMode(false);
      } else {
        setCompareScan(data);
        setCompareMode(true);
      }
    } finally {
      setLoadingId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void loadHistory(search);
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <h2>Scan History</h2>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              className="text-input"
              style={{ width: 220 }}
              type="text"
              placeholder="Filter by business…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-secondary" type="submit">Search</button>
            {search && <button className="btn-secondary" type="button" onClick={() => { setSearch(""); void loadHistory(""); }}>Clear</button>}
          </form>
        </div>
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
              <span className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : scans.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
              No scans found. Run your first scan from New Scan.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Business", "Keyword", "Grid", "Points", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "8px 16px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500 }}>{s.businessName}</td>
                    <td style={{ padding: "10px 16px", color: "var(--color-text-muted)" }}>{s.keyword}</td>
                    <td style={{ padding: "10px 16px", color: "var(--color-text-muted)", fontSize: 12 }}>
                      {s.gridConfig.gridSize}×{s.gridConfig.gridSize} {s.gridConfig.shape}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <span>{s.rankedPoints}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>/{s.totalPoints}</span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>{statusBadge(s.status)}</td>
                    <td style={{ padding: "10px 16px", color: "var(--color-text-muted)", fontSize: 12 }}>
                      {ago(s.createdAt)}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                          onClick={() => void openScan(s.id, "main")}
                          disabled={loadingId === s.id}
                        >
                          {loadingId === s.id ? "…" : "View"}
                        </button>
                        {viewScan && viewScan.id !== s.id && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                            onClick={() => void openScan(s.id, "compare")}
                            disabled={loadingId === s.id}
                          >
                            Compare
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && total > scans.length && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-text-muted)" }}>
              Showing {scans.length} of {total} scans
            </div>
          )}
        </div>
      </div>

      {viewScan && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>
              {compareMode ? "Scan A — " : ""}{viewScan.business.name} / {viewScan.keyword}
            </h3>
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setViewScan(null); setCompareScan(null); setCompareMode(false); }}>
              Close
            </button>
          </div>
          <ScanResultsMap result={viewScan} />
          {!compareMode && <CompetitorLeaderboard scanId={viewScan.id} trackedBusinessName={viewScan.business.name} />}
          {!compareMode && <div className="card" style={{ overflow: "hidden" }}><ExportBar scanId={viewScan.id} /></div>}
        </>
      )}

      {compareMode && compareScan && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Scan B — {compareScan.business.name} / {compareScan.keyword}</h3>
          </div>
          <ScanResultsMap result={compareScan} />
          <CompareDiff a={viewScan!} b={compareScan} />
        </>
      )}
    </div>
  );
}

function CompareDiff({ a, b }: { a: ScanResponse; b: ScanResponse }) {
  const pointsA = new Map(a.points.map((p) => [p.index, p]));
  const shared = b.points.filter((p) => pointsA.has(p.index));

  const rows = shared.map((pb) => {
    const pa = pointsA.get(pb.index)!;
    const diff = pa.rank != null && pb.rank != null ? pa.rank - pb.rank : null;
    return { index: pb.index, rankA: pa.rank, rankB: pb.rank, diff };
  });

  return (
    <div className="card">
      <div className="card-header">
        <h2>Point-by-point diff</h2>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          positive = improved in A vs B
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Pt #", "Scan A rank", "Scan B rank", "Change"].map((h) => (
                <th key={h} style={{ padding: "6px 16px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "6px 16px" }}>{r.index + 1}</td>
                <td style={{ padding: "6px 16px" }}>{r.rankA ?? "—"}</td>
                <td style={{ padding: "6px 16px" }}>{r.rankB ?? "—"}</td>
                <td style={{ padding: "6px 16px", fontWeight: 600, color: r.diff === null ? "var(--color-text-muted)" : r.diff > 0 ? "var(--color-rank-good)" : r.diff < 0 ? "var(--color-rank-poor)" : "var(--color-text-muted)" }}>
                  {r.diff === null ? "—" : r.diff > 0 ? `▲ ${r.diff}` : r.diff < 0 ? `▼ ${Math.abs(r.diff)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
