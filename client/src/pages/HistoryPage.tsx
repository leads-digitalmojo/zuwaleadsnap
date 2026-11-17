import { useState, useEffect, useCallback } from "react";
import { ScanResultsMap } from "../components/ScanResultsMap";
import { CompetitorLeaderboard } from "../components/CompetitorLeaderboard";
import { ExportBar } from "../components/ExportBar";
import { Pagination } from "../components/Pagination";
import { IconCrown, IconUser, IconSearch, IconChevronUp, IconChevronDown } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import type { ScanListItem, ScanResponse } from "../types";

interface HistoryResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  scans: Array<ScanListItem & { userEmail?: string | null }>;
}

function statusBadge(s: string) {
  const color = s === "complete" ? "var(--rank-good)" : s === "error" ? "var(--rank-poor)" : "var(--gold-deep)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: s === "complete" ? "var(--rank-good-tint)" : s === "error" ? "var(--rank-poor-tint)" : "var(--gold-tint)",
        color,
      }}
    >
      {s}
    </span>
  );
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface HistoryPageProps {
  onViewScan?: (scanId: number) => void;
}

export function HistoryPage({ onViewScan }: HistoryPageProps = {}) {
  const { user, role, authFetch } = useAuth();
  const [scans, setScans] = useState<Array<ScanListItem & { userEmail?: string | null }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [viewScan, setViewScan] = useState<ScanResponse | null>(null);
  const [compareScan, setCompareScan] = useState<ScanResponse | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const loadHistory = useCallback(
    async (targetPage = 1, targetLimit = limit, q = search, email = emailFilter) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(targetLimit),
        });
        if (q) params.set("business", q);
        if (email && role === "admin") params.set("email", email);

        const res = await authFetch(`/api/scans?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load history");
        const data = (await res.json()) as HistoryResponse;
        setScans(data.scans ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? targetPage);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        // silent fail - no console logs on client side
      } finally {
        setIsLoading(false);
      }
    },
    [authFetch, limit, search, emailFilter, role]
  );

  useEffect(() => {
    void loadHistory(1, limit);
  }, [loadHistory, limit, user]);

  async function openScan(id: number, slot: "main" | "compare") {
    if (slot === "main" && onViewScan) {
      onViewScan(id);
      return;
    }
    setLoadingId(id);
    try {
      const res = await authFetch(`/scan/${id}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error ?? "Failed to open scan");
        return;
      }
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
    void loadHistory(1, limit, search, emailFilter);
  }

  return (
    <div className="card-stack">
      {/* RBAC Scope Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          background: role === "admin" ? "var(--gold-tint)" : "var(--surface)",
          border: role === "admin" ? "1px solid #ebd48f" : "1px solid var(--hairline)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: role === "admin" ? "var(--gold)" : "var(--surface-hover)",
              color: role === "admin" ? "var(--ink)" : "var(--ink-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {role === "admin" ? <IconCrown size={18} /> : <IconUser size={18} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {role === "admin" ? "Admin Access: All Organization Scans" : "Member View: Your Scans"}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
              {role === "admin"
                ? "As an administrator, you can view, compare, and manage scan requests across all @digitalmojo.in team members."
                : "Showing scan queries and GBP geo-grid reports submitted by your account."}
            </div>
          </div>
        </div>

        {role === "admin" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="text-input"
              style={{ width: 200, padding: "6px 10px", fontSize: 12 }}
              type="text"
              placeholder="Filter by user email…"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
            <button
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => void loadHistory(1, limit, search, emailFilter)}
            >
              Filter
            </button>
            {emailFilter && (
              <button
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => {
                  setEmailFilter("");
                  void loadHistory(1, limit, search, "");
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>
            Scan History
            <span style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
              ({total} total {total === 1 ? "scan" : "scans"})
            </span>
          </h2>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              className="text-input"
              style={{ width: 220 }}
              type="text"
              placeholder="Search business…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-secondary" type="submit">Search</button>
            {search && (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setSearch("");
                  void loadHistory(1, limit, "", emailFilter);
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>
              <span className="spinner" style={{ margin: "0 auto" }} />
              <div style={{ marginTop: 10, fontSize: 12.5 }}>Loading scan history…</div>
            </div>
          ) : scans.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
              No scans found matching your search. Start a new scan from <strong>New Scan</strong>.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-hover)" }}>
                  {["Business", "Keyword", "Grid Size", "Ranked Points", "Status", "Initiated By", "Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        borderBottom: "2px solid var(--hairline)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--ink)" }}>
                      {s.businessName}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-muted)" }}>
                      <span className="chip" style={{ fontSize: 11.5, padding: "3px 8px" }}>
                        {s.keyword}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {s.gridConfig.gridSize}×{s.gridConfig.gridSize} {s.gridConfig.shape}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      <strong>{s.rankedPoints}</strong>
                      <span style={{ color: "var(--ink-faint)" }}>/{s.totalPoints}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(s.status)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink-muted)" }}>
                      {s.userEmail ? (
                        <span title={s.userEmail} style={{ fontWeight: 500 }}>
                          {s.userEmail.split("@")[0]}@…
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-faint)" }}>System</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-muted)", fontSize: 12 }}>
                      {ago(s.createdAt)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "4px 10px" }}
                          onClick={() => void openScan(s.id, "main")}
                          disabled={loadingId === s.id}
                        >
                          {loadingId === s.id ? "…" : "View"}
                        </button>
                        {viewScan && viewScan.id !== s.id && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: "4px 10px" }}
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
        </div>

        {/* Paginated Footer */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => void loadHistory(p, limit, search, emailFilter)}
          onLimitChange={(l) => {
            setLimit(l);
            void loadHistory(1, l, search, emailFilter);
          }}
          itemName="scans"
        />
      </div>

      {viewScan && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              {compareMode ? "Scan A (Baseline) — " : "Active Scan — "}
              {viewScan.business.name} &nbsp;·&nbsp;
              <span style={{ color: "var(--gold-deep)" }}>"{viewScan.keyword}"</span>
            </h3>
            <button
              className="btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() => {
                setViewScan(null);
                setCompareScan(null);
                setCompareMode(false);
              }}
            >
              Close Viewer
            </button>
          </div>
          <ScanResultsMap result={viewScan} />
          {!compareMode && <CompetitorLeaderboard scanId={viewScan.id} trackedBusinessName={viewScan.business?.name || ""} />}
          {!compareMode && (
            <div className="card" style={{ overflow: "hidden" }}>
              <ExportBar scanId={viewScan.id} />
            </div>
          )}
        </>
      )}

      {compareMode && compareScan && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              Scan B (Comparison) — {compareScan.business.name} &nbsp;·&nbsp;
              <span style={{ color: "var(--gold-deep)" }}>"{compareScan.keyword}"</span>
            </h3>
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
        <h2>Point-by-Point Rank Delta</h2>
        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          Positive (green) = rank improved from A to B
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "var(--surface-hover)" }}>
              {["Grid Point", "Scan A Rank", "Scan B Rank", "Net Movement"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    borderBottom: "2px solid var(--hairline)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.index} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <td style={{ padding: "8px 16px", fontFamily: "var(--font-mono)" }}>#{r.index + 1}</td>
                <td style={{ padding: "8px 16px", fontFamily: "var(--font-mono)" }}>{r.rankA ?? "—"}</td>
                <td style={{ padding: "8px 16px", fontFamily: "var(--font-mono)" }}>{r.rankB ?? "—"}</td>
                <td
                  style={{
                    padding: "8px 16px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color:
                      r.diff === null
                        ? "var(--ink-faint)"
                        : r.diff > 0
                        ? "var(--rank-good)"
                        : r.diff < 0
                        ? "var(--rank-poor)"
                        : "var(--ink-muted)",
                  }}
                >
                  {r.diff === null ? (
                    "—"
                  ) : r.diff > 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <IconChevronUp size={13} />
                      <span>+{r.diff}</span>
                    </span>
                  ) : r.diff < 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <IconChevronDown size={13} />
                      <span>{r.diff}</span>
                    </span>
                  ) : (
                    "="
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
