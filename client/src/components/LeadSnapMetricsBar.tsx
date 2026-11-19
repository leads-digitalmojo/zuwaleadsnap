import type { FC } from "react";
import type { ScanResponse, CompetitorStat } from "../types";
import { IconMapPin, IconStar, IconLayers, IconCompass } from "./Icons";

interface Props {
  scan: ScanResponse;
  activeCompetitor?: CompetitorStat | null;
  onResetCompetitor?: () => void;
}

export const LeadSnapMetricsBar: FC<Props> = ({
  scan,
  activeCompetitor,
  onResetCompetitor,
}) => {
  const isFlipped = !!activeCompetitor;
  const targetName = isFlipped ? activeCompetitor.name : scan.business.name;

  const stats = scan.stats;
  const totalPoints = stats.totalPoints || scan.points.length || 1;

  // Use flipped stats if active, otherwise use scan stats
  const agr = isFlipped
    ? activeCompetitor.avgRank
    : stats.agr ?? (stats.pointsComplete > 0 ? "–" : "–");

  const atgr = isFlipped
    ? activeCompetitor.atgr
    : stats.atgr ?? "–";

  const top3Pct = isFlipped
    ? `${activeCompetitor.top3Pct}%`
    : stats.top3Pct != null
    ? `${stats.top3Pct}%`
    : "–";

  const top10Pct = isFlipped
    ? `${activeCompetitor.top10Pct}%`
    : stats.top10Pct != null
    ? `${stats.top10Pct}%`
    : "–";

  const marketShare = isFlipped
    ? `${activeCompetitor.marketShare}%`
    : stats.marketShare != null
    ? `${stats.marketShare}%`
    : "–";

  const nw = isFlipped ? activeCompetitor.northWest : stats.quadrants?.northWest;
  const ne = isFlipped ? activeCompetitor.northEast : stats.quadrants?.northEast;
  const sw = isFlipped ? activeCompetitor.southWest : stats.quadrants?.southWest;
  const se = isFlipped ? activeCompetitor.southEast : stats.quadrants?.southEast;

  const spacingMeters = stats.betweenPointsMeters ?? Math.round(scan.gridConfig.spacingKm * 1000);
  const areaFormatted = stats.areaKm2 ? `${stats.areaKm2.toLocaleString()} km²` : "–";

  return (
    <div className="leadsnap-metrics-container card" style={{ padding: "16px 20px", marginBottom: 16 }}>
      {/* Top Identity Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 14,
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {targetName}
              </h2>
              {isFlipped && (
                <span
                  style={{
                    background: "var(--gold-tint)",
                    color: "var(--gold-deep)",
                    border: "1px solid #ebd48f",
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Flipped Competitor View
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 12,
                color: "var(--ink-muted)",
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              {scan.business.address && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconMapPin size={12} style={{ color: "var(--ink-faint)" }} />
                  <span>{scan.business.address}</span>
                </span>
              )}

              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconLayers size={12} style={{ color: "var(--gold-deep)" }} />
                <span>Keyword: <strong style={{ color: "var(--ink)" }}>"{scan.keyword}"</strong></span>
              </span>
            </div>
          </div>
        </div>

        {isFlipped && onResetCompetitor && (
          <button
            onClick={onResetCompetitor}
            className="btn-secondary"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              background: "#ffffff",
              borderColor: "var(--gold)",
              color: "var(--gold-deep)",
              fontWeight: 600,
            }}
          >
            Reset to Tracked Business
          </button>
        )}
      </div>

      {/* LeadSnap Parity Metric Badges */}
      <div
        className="leadsnap-metric-pills-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {/* AGR */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Avg Ranking (AGR)</div>
          <div className="metric-pill-val" style={{ color: "var(--color-rank-good)" }}>
            {agr}
          </div>
          <div className="metric-pill-sub">Top-20 Average</div>
        </div>

        {/* ATGR */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Total Grid Rank (ATGR)</div>
          <div className="metric-pill-val" style={{ color: "var(--ink)" }}>
            {atgr}
          </div>
          <div className="metric-pill-sub">Across All Points</div>
        </div>

        {/* Top 3% */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Top 3% Pack</div>
          <div className="metric-pill-val" style={{ color: "var(--color-rank-good)" }}>
            {top3Pct}
          </div>
          <div className="metric-pill-sub">Dominant Share</div>
        </div>

        {/* Top 10% */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Top 10% Page 1</div>
          <div className="metric-pill-val" style={{ color: "var(--gold-deep)" }}>
            {top10Pct}
          </div>
          <div className="metric-pill-sub">First Page Presence</div>
        </div>

        {/* Market Share */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Market Share</div>
          <div className="metric-pill-val" style={{ color: "var(--ink)" }}>
            {marketShare}
          </div>
          <div className="metric-pill-sub">Visibility Ratio</div>
        </div>

        {/* Between Points */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Point Distance</div>
          <div className="metric-pill-val" style={{ fontSize: 16 }}>
            {spacingMeters}m
          </div>
          <div className="metric-pill-sub">{scan.gridConfig.spacingKm} km Step</div>
        </div>

        {/* Total Area */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Total Area</div>
          <div className="metric-pill-val" style={{ fontSize: 16 }}>
            {areaFormatted}
          </div>
          <div className="metric-pill-sub">{scan.gridConfig.shape} radius</div>
        </div>

        {/* Grid Size */}
        <div className="metric-pill-card">
          <div className="metric-pill-label">Grid Matrix</div>
          <div className="metric-pill-val" style={{ fontSize: 16 }}>
            {scan.gridConfig.gridSize}×{scan.gridConfig.gridSize}
          </div>
          <div className="metric-pill-sub">{totalPoints} Points Total</div>
        </div>
      </div>

      {/* Quadrants Row (LeadSnap NW / NE / SW / SE Regional Breakdown) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px dashed var(--hairline)",
          fontSize: 11,
          color: "var(--ink-muted)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, color: "var(--ink)" }}>
          <IconCompass size={13} style={{ color: "var(--gold-deep)" }} />
          <span>Regional Quadrants:</span>
        </span>

        <span className="quadrant-badge">
          NW: <strong>{nw ?? "–"}</strong>
        </span>
        <span className="quadrant-badge">
          NE: <strong>{ne ?? "–"}</strong>
        </span>
        <span className="quadrant-badge">
          SW: <strong>{sw ?? "–"}</strong>
        </span>
        <span className="quadrant-badge">
          SE: <strong>{se ?? "–"}</strong>
        </span>
      </div>
    </div>
  );
};
