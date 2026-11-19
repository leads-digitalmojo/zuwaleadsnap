import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibraries } from "../lib/googleMaps";
import { Pagination } from "./Pagination";
import { IconAlertTriangle, IconX, IconStar, IconRefresh } from "./Icons";
import type { ScanResponse, ScanPoint, CompetitorStat } from "../types";

interface Props {
  result: ScanResponse;
  isLive?: boolean;
  activeCompetitor?: CompetitorStat | null;
  onResetCompetitor?: () => void;
}

type ViewMode = "pins" | "heat";

function rankColor(rank: number | null): string {
  if (rank === null || rank > 20) return "#d93d3d";  // Crimson / Danger
  if (rank > 10) return "#e05638";                   // Muted Terracotta / Drop-off
  if (rank > 3) return "#f0bc00";                    // Signature Mojo Gold — 4-10
  return "#1f9d55";                                  // Mojo Success Green — 1-3
}

function rankLabel(rank: number | null): string {
  if (rank === null) return "–";
  if (rank > 20) return "20+";
  return String(rank);
}

function makePinEl(rank: number | null, mode: ViewMode): HTMLElement {
  const color = rankColor(rank);
  const el = document.createElement("div");
  if (mode === "pins") {
    const label = rankLabel(rank);
    const fontSize = label === "20+" ? "9px" : "11px";
    const textColor = rank != null && rank > 3 && rank <= 10 ? "#111013" : "#ffffff";
    el.style.cssText = [
      `width:28px;height:28px;border-radius:50%`,
      `background:${color};border:2.5px solid #ffffff`,
      `display:flex;align-items:center;justify-content:center`,
      `color:${textColor};font-weight:800;font-size:${fontSize};letter-spacing:-0.5px`,
      `box-shadow:0 2px 6px rgba(17,16,19,0.3);cursor:pointer`,
      `font-family:"Plus Jakarta Sans", system-ui, sans-serif`,
      `box-sizing:border-box;line-height:1`,
      `transition:transform 0.15s ease`,
    ].join(";");
    el.textContent = label;
  } else {
    el.style.cssText = [
      `width:22px;height:22px;border-radius:4px`,
      `background:${color};border:2px solid rgba(255,255,255,0.85)`,
      `cursor:pointer;box-sizing:border-box`,
      `box-shadow:0 2px 4px rgba(17,16,19,0.25)`,
    ].join(";");
  }
  return el;
}

type AdvancedMarkerClass = typeof google.maps.marker.AdvancedMarkerElement;

export function ScanResultsMap({
  result,
  isLive = false,
  activeCompetitor,
  onResetCompetitor,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const AMERef = useRef<AdvancedMarkerClass | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pins");
  const [selectedPoint, setSelectedPoint] = useState<ScanPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // Init Google Maps safely (singleton loader, reuses loaded DOM script)
  useEffect(() => {
    if (!mapDivRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        const { Map, AdvancedMarkerElement } = await loadGoogleMapsLibraries();
        if (cancelled || !mapDivRef.current) return;

        const center = { lat: result.gridConfig.centerLat, lng: result.gridConfig.centerLng };
        const map = new Map(mapDivRef.current, {
          center,
          zoom: 12,
          mapId: "mojomap-rank-map",
          gestureHandling: "greedy", // Smooth single-finger pan / effortless wheel zoom
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
        });
        mapRef.current = map;
        AMERef.current = AdvancedMarkerElement;
        setMapReady(true);
        setMapsError(null);
      } catch (err) {
        if (!cancelled) setMapsError((err as Error).message || "Failed to load Google Maps");
      }
    })();

    return () => { cancelled = true; };
  }, [result.gridConfig.centerLat, result.gridConfig.centerLng]);

  // Re-render markers when map is ready, viewMode changes, points arrive, or competitor flip changes
  useEffect(() => {
    const map = mapRef.current;
    const AME = AMERef.current;
    if (!map || !AME || !result.points.length) return;

    // Clear old markers
    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current = [];

    for (const point of result.points) {
      // Derive effective rank based on whether competitor flip is active
      const effectiveRank = activeCompetitor
        ? activeCompetitor.pointRanks[point.index] ?? null
        : point.rank;

      const el = makePinEl(effectiveRank, viewMode);
      const marker = new AME({
        map,
        position: { lat: point.lat, lng: point.lng },
        content: el,
        zIndex: effectiveRank != null ? (21 - effectiveRank) : 0,
      });

      marker.addListener("click", () => {
        setSelectedPoint(point);
      });
      markersRef.current.push(marker);
    }
  }, [mapReady, viewMode, result.points, activeCompetitor]);

  const points = result?.points || [];
  const targetBusinessName = activeCompetitor ? activeCompetitor.name : result.business.name;

  // Calculate live or flipped average rank
  let effectiveAvgRank = "–";
  let effectiveRankedCount = 0;

  if (activeCompetitor) {
    effectiveAvgRank = activeCompetitor.avgRank.toFixed(1);
    effectiveRankedCount = activeCompetitor.totalPoints;
  } else {
    const ranked = points.filter((p) => p.rank !== null);
    effectiveRankedCount = ranked.length;
    effectiveAvgRank = ranked.length > 0
      ? (ranked.reduce((s, p) => s + (p.rank ?? 0), 0) / ranked.length).toFixed(1)
      : "–";
  }

  if (mapsError) {
    return <FallbackGrid result={result} />;
  }

  return (
    <div className="results-section">
      {/* Flip The Grid Active Banner */}
      {activeCompetitor && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1px solid #fde68a",
            borderRadius: "var(--radius)",
            marginBottom: 12,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: "#f59e0b",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 4,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Flip Active
            </span>
            <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
              Viewing Grid as: <strong>{activeCompetitor.name}</strong> (AGR: {activeCompetitor.avgRank}, ATGR: {activeCompetitor.atgr})
            </span>
          </div>

          {onResetCompetitor && (
            <button
              onClick={onResetCompetitor}
              className="btn-secondary"
              style={{
                fontSize: 11,
                padding: "4px 10px",
                background: "#ffffff",
                borderColor: "#f59e0b",
                color: "#b45309",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <IconRefresh size={12} />
              <span>Reset to Tracked Business</span>
            </button>
          )}
        </div>
      )}

      <div className="results-header">
        <h2>
          Rank Map — {result.keyword}
          {isLive && <span style={{ marginLeft: 10, fontSize: 11, color: "var(--color-rank-mid)", fontWeight: 500 }}>● scanning…</span>}
        </h2>
        <div className="results-meta">
          <span className="map-legend">
            <span className="legend-good">● 1–3</span>
            <span style={{ color: "#f97316" }}> ● 4–10</span>
            <span className="legend-poor"> ● 11–20</span>
            <span style={{ color: "#b91c1c" }}> ● 20+</span>
          </span>
          <span>Avg rank: <strong>{effectiveAvgRank}</strong></span>
          <span>{effectiveRankedCount}/{points.length} ranked</span>
          <div className="view-toggle">
            <button className={viewMode === "pins" ? "active" : ""} onClick={() => setViewMode("pins")}>Pins</button>
            <button className={viewMode === "heat" ? "active" : ""} onClick={() => setViewMode("heat")}>Heat</button>
          </div>
        </div>
      </div>

      <div className="map-container" style={{ position: "relative" }}>
        {mapsError ? (
          <div className="map-no-key">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              <IconAlertTriangle size={16} />
              <span>Map failed to load: {mapsError}</span>
            </div>
            <FallbackGrid result={result} />
          </div>
        ) : (
          <>
            <div ref={mapDivRef} className="map-el" />
            <button
              type="button"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.panTo({
                    lat: result.gridConfig.centerLat,
                    lng: result.gridConfig.centerLng,
                  });
                  mapRef.current.setZoom(12);
                }
              }}
              title="Recenter Map View"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "#ffffff",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                zIndex: 10,
              }}
            >
              <IconRefresh size={12} />
              <span>Recenter</span>
            </button>
          </>
        )}

        {selectedPoint && (
          <PointPanel
            point={selectedPoint}
            activeCompetitor={activeCompetitor}
            trackedBusinessName={result.business.name}
            onClose={() => setSelectedPoint(null)}
          />
        )}
      </div>
    </div>
  );
}

function PointPanel({
  point,
  activeCompetitor,
  trackedBusinessName,
  onClose,
}: {
  point: ScanPoint;
  activeCompetitor?: CompetitorStat | null;
  trackedBusinessName: string;
  onClose: () => void;
}) {
  const currentRank = activeCompetitor
    ? activeCompetitor.pointRanks[point.index] ?? null
    : point.rank;

  const color = rankColor(currentRank);
  const targetName = activeCompetitor ? activeCompetitor.name : trackedBusinessName;

  return (
    <div className="point-panel" style={{ zIndex: 100 }}>
      <div className="point-panel-header">
        <div>
          <h3 style={{ margin: 0, fontSize: 14 }}>Grid Point #{point.index + 1}</h3>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </div>
        </div>
        <button className="btn-close-panel" onClick={onClose} style={{ display: "inline-flex", alignItems: "center" }}>
          <IconX size={15} />
        </button>
      </div>

      <div className="point-panel-body">
        <div className="rank-display">
          {currentRank != null ? (
            <>
              <div className="rank-number" style={{ color }}>
                {currentRank > 20 ? "20+" : `#${currentRank}`}
              </div>
              <div className="rank-label">
                Rank for <strong>{targetName}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="rank-number" style={{ color }}>—</div>
              <div className="rank-label">Not in Top 20</div>
            </>
          )}
        </div>

        <div className="competitors-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Top Local Pack Results ({point.topResults.length})</span>
        </div>

        {point.topResults.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No SERP items found at this point</p>
        ) : (
          <ul className="competitor-list">
            {point.topResults.slice(0, 10).map((r, i) => {
              const isTarget = r.name.toLowerCase().includes(targetName.toLowerCase());
              return (
                <li
                  key={i}
                  className="competitor-item"
                  style={{
                    background: isTarget ? "var(--gold-tint)" : undefined,
                    border: isTarget ? "1px solid #ebd48f" : undefined,
                    padding: "6px 8px",
                    borderRadius: 6,
                    marginBottom: 4,
                  }}
                >
                  <span className="comp-rank" style={{ minWidth: 22, height: 22, fontSize: 11 }}>
                    {r.rank}
                  </span>
                  <div className="comp-info">
                    <div className="comp-name" style={{ fontWeight: isTarget ? 700 : 500, fontSize: 12 }}>
                      {r.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ink-muted)" }}>
                      {r.rating != null && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <IconStar size={10} style={{ color: "var(--gold-deep)" }} />
                          <span>{r.rating} ({r.reviews ?? 0})</span>
                        </span>
                      )}
                      {r.category && (
                        <span style={{ opacity: 0.85 }}>&middot; {r.category}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FallbackGrid({ result }: { result: ScanResponse }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const total = result.points.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginated = result.points.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>Rank Grid Table — {result.keyword}</h2>
        <div className="results-meta">
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            Set VITE_GOOGLE_MAPS_JS_API_KEY for map view
          </span>
        </div>
      </div>
      <div className="fallback-grid">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Rank</th>
              <th>Top Result</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => {
              const rankClass =
                p.rank === null ? "rank-poor"
                : p.rank <= 3 ? "rank-good"
                : p.rank <= 10 ? "rank-mid"
                : "rank-poor";
              const top = p.topResults[0];
              return (
                <tr key={p.index}>
                  <td>{p.index + 1}</td>
                  <td>{p.lat.toFixed(5)}</td>
                  <td>{p.lng.toFixed(5)}</td>
                  <td>
                    <span className={`rank-pill ${rankClass}`}>
                      {p.rank ?? "–"}
                    </span>
                    {p.cacheHit && <span className="rank-cache">cached</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {top ? `${top.name} (#${top.rank})` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={pageSize}
          onPageChange={setPage}
          itemName="points"
        />
      )}
    </div>
  );
}
