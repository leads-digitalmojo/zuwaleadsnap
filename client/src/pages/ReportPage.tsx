import { useState, useEffect } from "react";
import { IconLock } from "../components/Icons";
import type { ScanResponse, CompetitorStat } from "../types";

interface ReportData {
  scan: Record<string, unknown>;
  points: Array<Record<string, unknown>>;
  competitors: CompetitorStat[];
  shareToken: string;
}

function rankColor(rank: number | null | undefined) {
  if (rank == null || rank > 10) return "var(--color-rank-poor)";
  if (rank <= 3) return "var(--color-rank-good)";
  return "var(--color-rank-mid)";
}

interface Props {
  token: string;
}

export function ReportPage({ token }: Props) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/report/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Report not found");
        return r.json() as Promise<ReportData>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) return (
    <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-muted)" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <IconLock size={40} style={{ color: "var(--gold)" }} />
      </div>
      <h2 style={{ marginBottom: 8 }}>Report not found</h2>
      <p>This link may have expired or is invalid.</p>
    </div>
  );

  if (!data) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <span className="spinner" style={{ margin: "0 auto", width: 24, height: 24, borderWidth: 3 }} />
    </div>
  );

  const { scan, points, competitors } = data;
  const ranked = points.filter((p) => p["rank"] != null);
  const avgRank = ranked.length > 0
    ? (ranked.reduce((s, p) => s + (p["rank"] as number), 0) / ranked.length).toFixed(1)
    : "—";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 60px" }}>
      {/* Header */}
      <div style={{ background: "var(--ink)", color: "#fff", padding: "28px 32px", borderRadius: "var(--radius)", border: "1px solid #232227", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, boxShadow: "var(--shadow-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#19181c", border: "1px solid #2c2b32", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 620 404" fill="none" style={{ width: 24, height: 24 }}>
              <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
              <path d="M190 100 L330 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
              <path d="M425 100 L520 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              MojoMap · GBP Geo-Grid Rank Report
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{String(scan["business_name"])}</h1>
            <div style={{ fontSize: 12.5, color: "#a4a2aa", marginTop: 4 }}>
              Keyword: <strong style={{ color: "#fff" }}>{String(scan["keyword"])}</strong> &nbsp;·&nbsp;
              {String(scan["grid_size"])}×{String(scan["grid_size"])} {String(scan["shape"])} grid &nbsp;·&nbsp;
              {new Date((scan["created_at"] as number) * 1000).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Points", value: String(scan["total_points"] ?? 0) },
            { label: "Ranked Points", value: `${ranked.length}/${points.length}` },
            { label: "Average Rank", value: String(avgRank) },
            { label: "Competitors Tracked", value: `${competitors.length}+` },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", padding: "16px 18px", boxShadow: "var(--shadow-1)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Grid points table */}
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: "-0.01em", color: "var(--ink)" }}>Grid Results</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 28, boxShadow: "var(--shadow-1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-hover)" }}>{["Point", "Latitude", "Longitude", "Rank", "Top Result"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", borderBottom: "2px solid var(--hairline)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {points.map((p) => {
                let topName = "—";
                try {
                  const arr = JSON.parse(String(p["top_results"] ?? "[]")) as Array<{ name: string; rank: number }>;
                  if (arr[0]) topName = `${arr[0].name} (#${arr[0].rank})`;
                } catch { /* skip */ }
                const rank = p["rank"] as number | null;
                const isMid = rank != null && rank > 3 && rank <= 10;
                return (
                  <tr key={String(p["id"])} style={{ borderBottom: "1px solid var(--surface-hover)" }}>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)" }}>#{Number(p["point_index"]) + 1}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)" }}>{Number(p["lat"]).toFixed(5)}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)" }}>{Number(p["lng"]).toFixed(5)}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <span className="rank-pill" style={{ background: rankColor(rank), color: isMid ? "#111013" : "#ffffff" }}>
                        {rank ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 14px", color: "var(--ink-muted)" }}>{topName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Competitor leaderboard */}
        {competitors.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 14, letterSpacing: "-0.01em", color: "var(--ink)" }}>
              Top Competitors
            </h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 28, boxShadow: "var(--shadow-1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--surface-hover)" }}>{["#", "Business", "Avg Rank", "Top-3 %", "Visibility Points"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", borderBottom: "2px solid var(--hairline)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {competitors.slice(0, 20).map((c, i) => (
                    <tr key={c.placeId || c.name} style={{ borderBottom: "1px solid var(--surface-hover)" }}>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{i + 1}</td>
                      <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--ink)" }}>{c.name}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontWeight: 700, color: rankColor(c.avgRank) }}>{c.avgRank.toFixed(1)}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)" }}>{c.top3Pct}%</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{c.totalPoints} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--hairline)", fontSize: 11.5, color: "var(--ink-faint)", textAlign: "center" }}>
          Generated by MojoMap · GBP Geo-Grid Intelligence · {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
