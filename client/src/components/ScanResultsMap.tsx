import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Pagination } from "./Pagination";
import { IconAlertTriangle, IconX, IconStar } from "./Icons";
import type { ScanResponse, ScanPoint } from "../types";

interface Props {
  result: ScanResponse;
  isLive?: boolean;
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

function makePinEl(point: ScanPoint, mode: ViewMode): HTMLElement {
  const color = rankColor(point.rank);
  const el = document.createElement("div");
  if (mode === "pins") {
    const label = rankLabel(point.rank);
    const fontSize = label === "20+" ? "9px" : "11px";
    const textColor = point.rank != null && point.rank > 3 && point.rank <= 10 ? "#111013" : "#ffffff";
    el.style.cssText = [
      `width:28px;height:28px;border-radius:50%`,
      `background:${color};border:2.5px solid #ffffff`,
      `display:flex;align-items:center;justify-content:center`,
      `color:${textColor};font-weight:800;font-size:${fontSize};letter-spacing:-0.5px`,
      `box-shadow:0 2px 6px rgba(17,16,19,0.3);cursor:pointer`,
      `font-family:"Plus Jakarta Sans", system-ui, sans-serif`,
      `box-sizing:border-box;line-height:1`,
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

export function ScanResultsMap({ result, isLive = false }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const AMERef = useRef<AdvancedMarkerClass | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pins");
  const [selectedPoint, setSelectedPoint] = useState<ScanPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const mapsKey = (import.meta.env["VITE_GOOGLE_MAPS_JS_API_KEY"] as string | undefined) ?? "";

  // Init Google Maps (once per component mount)
  useEffect(() => {
    if (!mapsKey || !mapDivRef.current) return;
    let cancelled = false;

    const loader = new Loader({ apiKey: mapsKey, version: "weekly" });

    void (async () => {
      try {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          loader.importLibrary("maps"),
          loader.importLibrary("marker"),
        ]);
        if (cancelled || !mapDivRef.current) return;

        const center = { lat: result.gridConfig.centerLat, lng: result.gridConfig.centerLng };
        const map = new Map(mapDivRef.current, {
          center,
          zoom: 12,
          mapId: "zuwa-rank-map",
        });
        mapRef.current = map;
        AMERef.current = AdvancedMarkerElement;
        setMapReady(true);
      } catch (err) {
        if (!cancelled) setMapsError((err as Error).message);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  // Re-render markers when map is ready, viewMode changes, or new points arrive
  useEffect(() => {
    const map = mapRef.current;
    const AME = AMERef.current;
    if (!map || !AME || !result.points.length) return;

    // Clear old markers
    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current = [];

    for (const point of result.points) {
      const el = makePinEl(point, viewMode);
      const marker = new AME({
        map,
        position: { lat: point.lat, lng: point.lng },
        content: el,
        zIndex: point.rank != null ? (21 - point.rank) : 0,
      });
      marker.addListener("click", () => setSelectedPoint(point));
      markersRef.current.push(marker);
    }
  }, [mapReady, viewMode, result.points]);

  const points = result.points;
  const ranked = points.filter((p) => p.rank !== null);
  const avgRank = ranked.length > 0
    ? (ranked.reduce((s, p) => s + (p.rank ?? 0), 0) / ranked.length).toFixed(1)
    : "–";

  if (!mapsKey) {
    return <FallbackGrid result={result} />;
  }

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>
          Rank Map — {result.keyword}
          {isLive && <span style={{ marginLeft: 10, fontSize: 11, color: "var(--color-rank-mid)", fontWeight: 500 }}>● scanning…</span>}
        </h2>
        <div className="results-meta">
          <span className="map-legend">
            <span className="legend-good">● 1–3</span>
            <span style={{color:"#f97316"}}> ● 4–10</span>
            <span className="legend-poor"> ● 11–20</span>
            <span style={{color:"#b91c1c"}}> ● 20+</span>
          </span>
          <span>Avg rank: <strong>{avgRank}</strong></span>
          <span>{ranked.length}/{points.length} ranked</span>
          <div className="view-toggle">
            <button className={viewMode === "pins" ? "active" : ""} onClick={() => setViewMode("pins")}>Pins</button>
            <button className={viewMode === "heat" ? "active" : ""} onClick={() => setViewMode("heat")}>Heat</button>
          </div>
        </div>
      </div>

      <div className="map-container">
        {mapsError ? (
          <div className="map-no-key">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              <IconAlertTriangle size={16} />
              <span>Map failed to load: {mapsError}</span>
            </div>
            <FallbackGrid result={result} />
          </div>
        ) : (
          <div ref={mapDivRef} className="map-el" />
        )}

        {selectedPoint && (
          <PointPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />
        )}
      </div>
    </div>
  );
}

function PointPanel({ point, onClose }: { point: ScanPoint; onClose: () => void }) {
  const color = rankColor(point.rank);

  return (
    <div className="point-panel">
      <div className="point-panel-header">
        <h3>Grid Point {point.index + 1}</h3>
        <button className="btn-close-panel" onClick={onClose} style={{ display: "inline-flex", alignItems: "center" }}>
          <IconX size={15} />
        </button>
      </div>
      <div className="point-panel-body">
        <div className="rank-display">
          {point.rank != null ? (
            <>
              <div className="rank-number" style={{ color }}>
                {point.rank > 20 ? "20+" : `#${point.rank}`}
              </div>
              <div className="rank-label">
                {point.rank > 20 ? `not in top 20 (actual: #${point.rank})` : "rank in Google Local Pack"}
              </div>
            </>
          ) : (
            <>
              <div className="rank-number" style={{ color }}>—</div>
              <div className="rank-label">not found</div>
            </>
          )}
        </div>

        <div className="competitors-label">Top Competitors</div>
        {point.topResults.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No data</p>
        ) : (
          <ul className="competitor-list">
            {point.topResults.slice(0, 5).map((r, i) => (
              <li key={i} className="competitor-item">
                <span className="comp-rank">{r.rank}</span>
                <div className="comp-info">
                  <div className="comp-name">{r.name}</div>
                  {r.rating != null && (
                    <div className="comp-rating" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <IconStar size={11} style={{ color: "var(--gold)" }} />
                      <span>{r.rating}{r.reviews != null ? ` · ${r.reviews} reviews` : ""}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
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
