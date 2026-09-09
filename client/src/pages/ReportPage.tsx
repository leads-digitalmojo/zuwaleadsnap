import { useState, useEffect } from "react";
import type { ScanResponse } from "../types";
import type { CompetitorStat } from "../components/CompetitorLeaderboard";

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
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
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
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ background: "var(--color-navy)", color: "#fff", padding: "28px 32px" }}>
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Zuwa Grid Rank Report
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{String(scan["business_name"])}</h1>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          Keyword: <strong>{String(scan["keyword"])}</strong> &nbsp;·&nbsp;
          {String(scan["grid_size"])}×{String(scan["grid_size"])} {String(scan["shape"])} grid &nbsp;·&nbsp;
          {new Date((scan["created_at"] as number) * 1000).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total Points", value: String(scan["total_points"] ?? 0) },
            { label: "Ranked", value: `${ranked.length}/${points.length}` },
            { label: "Avg Rank", value: String(avgRank) },
            { label: "Competitors", value: `${competitors.length}+` },
          ].map((s) => (
            <div key={s.label} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Grid points table */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid var(--color-border)" }}>Grid Results</h2>
        <div style={{ overflowX: "auto", marginBottom: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Point", "Latitude", "Longitude", "Rank", "Top Result"].map((h) => (
                <th key={h} style={{ padding: "6px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
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
                return (
                  <tr key={String(p["id"])} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "6px 12px" }}>{Number(p["point_index"]) + 1}</td>
                    <td style={{ padding: "6px 12px" }}>{Number(p["lat"]).toFixed(5)}</td>
                    <td style={{ padding: "6px 12px" }}>{Number(p["lng"]).toFixed(5)}</td>
                    <td style={{ padding: "6px 12px" }}>
                      <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700, color: "#fff", background: rankColor(rank) }}>
                        {rank ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 12px", color: "var(--color-text-muted)" }}>{topName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Competitor leaderboard */}
        {competitors.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid var(--color-border)" }}>
              Top Competitors
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{["#", "Business", "Avg Rank", "Top-3 %", "Visibility"].map((h) => (
                  <th key={h} style={{ padding: "6px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {competitors.slice(0, 20).map((c, i) => (
                  <tr key={c.placeId || c.name} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "6px 12px", color: "var(--color-text-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "6px 12px", fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "6px 12px", fontWeight: 600, color: rankColor(c.avgRank) }}>{c.avgRank.toFixed(1)}</td>
                    <td style={{ padding: "6px 12px" }}>{c.top3Pct}%</td>
                    <td style={{ padding: "6px 12px", color: "var(--color-text-muted)" }}>{c.totalPoints} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--color-border)", fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
          Generated by Zuwa Grid Rank Tracker · {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
