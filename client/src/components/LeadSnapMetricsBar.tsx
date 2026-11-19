import { useState, type FC } from "react";
import type { ScanResponse, CompetitorStat } from "../types";
import { IconMapPin, IconLayers, IconCompass } from "./Icons";

export type LayoutViewMode = "split" | "map" | "table";

interface Props {
  scan: ScanResponse;
  activeCompetitor?: CompetitorStat | null;
  onResetCompetitor?: () => void;
  layoutMode?: LayoutViewMode;
  onLayoutModeChange?: (mode: LayoutViewMode) => void;
}

export const LeadSnapMetricsBar: FC<Props> = ({
  scan,
  activeCompetitor,
  onResetCompetitor,
  layoutMode = "split",
  onLayoutModeChange,
}) => {
  const [showQuadrantModal, setShowQuadrantModal] = useState(false);
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
      {/* Top Identity & Layout Viewport Row */}
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

        {/* Action Buttons & Layout View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isFlipped && onResetCompetitor && (
            <button
              onClick={onResetCompetitor}
              className="btn-secondary"
              style={{
                fontSize: 11,
                padding: "5px 12px",
                background: "#ffffff",
                borderColor: "var(--gold)",
                color: "var(--gold-deep)",
                fontWeight: 700,
              }}
            >
              Reset to Tracked Business
            </button>
          )}

          {/* User Layout View Controls */}
          {onLayoutModeChange && (
            <div
              className="layout-view-controls"
              style={{
                display: "inline-flex",
                background: "var(--surface-hover)",
                padding: 3,
                borderRadius: 8,
                border: "1px solid var(--hairline)",
                gap: 2,
              }}
            >
              <button
                type="button"
                className={`layout-btn ${layoutMode === "split" ? "active" : ""}`}
                onClick={() => onLayoutModeChange("split")}
                title="Split 60/40 View (Map + Table)"
                style={{
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: layoutMode === "split" ? "#ffffff" : "transparent",
                  color: layoutMode === "split" ? "var(--ink)" : "var(--ink-muted)",
                  boxShadow: layoutMode === "split" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Split (60/40)
              </button>
              <button
                type="button"
                className={`layout-btn ${layoutMode === "map" ? "active" : ""}`}
                onClick={() => onLayoutModeChange("map")}
                title="Full Width Map View"
                style={{
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: layoutMode === "map" ? "#ffffff" : "transparent",
                  color: layoutMode === "map" ? "var(--ink)" : "var(--ink-muted)",
                  boxShadow: layoutMode === "map" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Map Focus
              </button>
              <button
                type="button"
                className={`layout-btn ${layoutMode === "table" ? "active" : ""}`}
                onClick={() => onLayoutModeChange("table")}
                title="Full Width Competitor Table"
                style={{
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: layoutMode === "table" ? "#ffffff" : "transparent",
                  color: layoutMode === "table" ? "var(--ink)" : "var(--ink-muted)",
                  boxShadow: layoutMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Table Focus
              </button>
            </div>
          )}
        </div>
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

      {/* Quadrants Row (LeadSnap Regional Matrix Breakdown) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px dashed var(--hairline)",
          fontSize: 12,
          color: "var(--ink-muted)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: "var(--ink)" }}>
            <IconCompass size={14} style={{ color: "var(--gold-deep)" }} />
            <span>Regional Quadrants:</span>
          </span>

          <span className="quadrant-badge">
            Northwest (NW): <strong>{nw ?? "–"}</strong>
          </span>
          <span className="quadrant-badge">
            Northeast (NE): <strong>{ne ?? "–"}</strong>
          </span>
          <span className="quadrant-badge">
            Southwest (SW): <strong>{sw ?? "–"}</strong>
          </span>
          <span className="quadrant-badge">
            Southeast (SE): <strong>{se ?? "–"}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowQuadrantModal(!showQuadrantModal)}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            color: "var(--gold-deep)",
            fontWeight: 700,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {showQuadrantModal ? "Hide Compass Grid" : "Open 2×2 Compass Grid"}
        </button>
      </div>

      {/* Interactive 2x2 Regional Compass Visualizer */}
      {showQuadrantModal && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            background: "var(--surface-hover)",
            borderRadius: 8,
            border: "1px solid var(--hairline)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 8 }}>
            Geographic Regional Compass — {targetName}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              maxWidth: 360,
            }}
          >
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>NW (Northwest)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: nw && nw <= 3 ? "var(--color-rank-good)" : "var(--ink)" }}>{nw ?? "–"}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>NE (Northeast)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ne && ne <= 3 ? "var(--color-rank-good)" : "var(--ink)" }}>{ne ?? "–"}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>SW (Southwest)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sw && sw <= 3 ? "var(--color-rank-good)" : "var(--ink)" }}>{sw ?? "–"}</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>SE (Southeast)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: se && se <= 3 ? "var(--color-rank-good)" : "var(--ink)" }}>{se ?? "–"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
