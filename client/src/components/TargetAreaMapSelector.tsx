import { useEffect, useRef, useState, type FC } from "react";
import { loadGoogleMapsLibraries } from "../lib/googleMaps";
import { IconMapPin, IconLayers, IconCompass, IconRefresh } from "./Icons";
import type { GridConfig, GridSize, GridShape } from "../types";

interface Props {
  centerLat: number;
  centerLng: number;
  businessName: string;
  config: GridConfig;
  onCenterChange: (lat: number, lng: number) => void;
}

function generatePreviewPoints(
  centerLat: number,
  centerLng: number,
  gridSize: GridSize,
  shape: GridShape,
  spacingKm: number
): Array<{ lat: number; lng: number }> {
  const half = Math.floor(gridSize / 2);
  const radiusKm = half * spacingKm;
  const points: Array<{ lat: number; lng: number }> = [];

  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const lat = centerLat + (row * spacingKm) / 110.574;
      const lng =
        centerLng +
        (col * spacingKm) / (111.32 * Math.cos((centerLat * Math.PI) / 180));

      if (shape === "circle") {
        // Simple haversine / euclidean approximation for preview
        const dLat = (lat - centerLat) * 110.574;
        const dLng = (lng - centerLng) * (111.32 * Math.cos((centerLat * Math.PI) / 180));
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distKm > radiusKm * 1.02) continue;
      }

      points.push({ lat, lng });
    }
  }
  return points;
}

export const TargetAreaMapSelector: FC<Props> = ({
  centerLat,
  centerLng,
  businessName,
  config,
  onCenterChange,
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const centerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const previewDotsRef = useRef<google.maps.Circle[]>([]);
  const boundsOverlayRef = useRef<google.maps.Circle | google.maps.Polygon | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentCenter, setCurrentCenter] = useState({ lat: centerLat, lng: centerLng });

  const spacingKm = config.unit === "mi" ? config.spacingValue * 1.60934 : config.spacingValue;
  const half = Math.floor(config.gridSize / 2);
  const radiusMeters = half * spacingKm * 1000;

  // Initialize Map
  useEffect(() => {
    if (!mapDivRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        const { Map, AdvancedMarkerElement } = await loadGoogleMapsLibraries();
        if (cancelled || !mapDivRef.current) return;

        const map = new Map(mapDivRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 12,
          mapId: "mojomap-target-selector",
          gestureHandling: "greedy", // Smooth single-finger pan / effortless wheel zoom
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });

        // Click on map to reposition center
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setCurrentCenter({ lat, lng });
            onCenterChange(lat, lng);
          }
        });

        // Create draggable custom center marker
        const pinEl = document.createElement("div");
        pinEl.className = "target-center-pin";
        pinEl.style.cssText = [
          "width: 32px; height: 32px; border-radius: 50%",
          "background: #111013; border: 3px solid #f0bc00",
          "box-shadow: 0 4px 12px rgba(17,16,19,0.35)",
          "display: flex; align-items: center; justify-content: center",
          "color: #feea59; font-weight: 800; font-size: 14px",
          "cursor: grab; user-select: none",
        ].join(";");
        pinEl.innerHTML = "🎯";

        const centerMarker = new AdvancedMarkerElement({
          map,
          position: { lat: centerLat, lng: centerLng },
          content: pinEl,
          gmpDraggable: true,
          title: "Drag to reposition grid target center",
        });

        centerMarker.addListener("dragend", () => {
          const pos = centerMarker.position;
          if (pos) {
            const lat = typeof pos.lat === "function" ? (pos.lat as () => number)() : (pos.lat as number);
            const lng = typeof pos.lng === "function" ? (pos.lng as () => number)() : (pos.lng as number);
            setCurrentCenter({ lat, lng });
            onCenterChange(lat, lng);
          }
        });

        mapRef.current = map;
        centerMarkerRef.current = centerMarker;
        setMapReady(true);
      } catch (err) {
        console.warn("Target selector map failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update center when props change externally
  useEffect(() => {
    if (centerMarkerRef.current && (centerLat !== currentCenter.lat || centerLng !== currentCenter.lng)) {
      centerMarkerRef.current.position = { lat: centerLat, lng: centerLng };
      mapRef.current?.panTo({ lat: centerLat, lng: centerLng });
      setCurrentCenter({ lat: centerLat, lng: centerLng });
    }
  }, [centerLat, centerLng]);

  // Update bounds overlay & preview dots whenever center, size, or spacing change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old overlays
    if (boundsOverlayRef.current) {
      boundsOverlayRef.current.setMap(null);
      boundsOverlayRef.current = null;
    }
    previewDotsRef.current.forEach((d) => d.setMap(null));
    previewDotsRef.current = [];

    // Draw Boundary Shape
    if (config.shape === "circle") {
      const circle = new google.maps.Circle({
        strokeColor: "#b87500",
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: "#f0bc00",
        fillOpacity: 0.12,
        map,
        center: { lat: currentCenter.lat, lng: currentCenter.lng },
        radius: radiusMeters,
        clickable: false,
      });
      boundsOverlayRef.current = circle;
    } else {
      // Square boundary polygon
      const latOffset = (half * spacingKm) / 110.574;
      const lngOffset = (half * spacingKm) / (111.32 * Math.cos((currentCenter.lat * Math.PI) / 180));
      const squareCoords = [
        { lat: currentCenter.lat + latOffset, lng: currentCenter.lng - lngOffset },
        { lat: currentCenter.lat + latOffset, lng: currentCenter.lng + lngOffset },
        { lat: currentCenter.lat - latOffset, lng: currentCenter.lng + lngOffset },
        { lat: currentCenter.lat - latOffset, lng: currentCenter.lng - lngOffset },
      ];
      const polygon = new google.maps.Polygon({
        paths: squareCoords,
        strokeColor: "#b87500",
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: "#f0bc00",
        fillOpacity: 0.12,
        map,
        clickable: false,
      });
      boundsOverlayRef.current = polygon;
    }

    // Draw live grid preview coordinate dots
    const previewPoints = generatePreviewPoints(
      currentCenter.lat,
      currentCenter.lng,
      config.gridSize,
      config.shape,
      spacingKm
    );

    const dotRadius = Math.max(30, (spacingKm * 1000) * 0.08);

    previewPoints.forEach((pt) => {
      const dot = new google.maps.Circle({
        strokeColor: "#111013",
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: "#ffffff",
        fillOpacity: 0.9,
        map,
        center: { lat: pt.lat, lng: pt.lng },
        radius: dotRadius,
        clickable: false,
      });
      previewDotsRef.current.push(dot);
    });
  }, [mapReady, currentCenter, config.gridSize, config.shape, spacingKm]);

  function handleRecenter() {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: centerLat, lng: centerLng });
      setCurrentCenter({ lat: centerLat, lng: centerLng });
      onCenterChange(centerLat, centerLng);
      if (centerMarkerRef.current) {
        centerMarkerRef.current.position = { lat: centerLat, lng: centerLng };
      }
    }
  }

  return (
    <div className="target-area-selector card" style={{ overflow: "hidden", marginTop: 14 }}>
      {/* Selector Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "var(--surface-hover)",
          borderBottom: "1px solid var(--hairline)",
          fontSize: 12,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--gold)",
              color: "#111013",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 11,
            }}
          >
            📍
          </span>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>
            Interactive Target Area Selector (LeadSnap Engine)
          </span>
          <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>
            &middot; Drag target pin or click anywhere on the map to set grid center
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)" }}>
            {currentCenter.lat.toFixed(4)}, {currentCenter.lng.toFixed(4)}
          </span>
          <button
            type="button"
            onClick={handleRecenter}
            className="btn-secondary"
            style={{ fontSize: 11, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
            title="Reset center to business location"
          >
            <IconRefresh size={11} />
            <span>Reset to Business</span>
          </button>
        </div>
      </div>

      {/* Map Element */}
      <div style={{ position: "relative" }}>
        <div ref={mapDivRef} style={{ width: "100%", height: 380, background: "#e5e3df" }} />

        {/* Legend / Status Pill on Map */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--hairline)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 11,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 10,
          }}
        >
          <span>
            Target Area: <strong>{((radiusMeters / 1000) * 2).toFixed(1)} km span</strong>
          </span>
          <span>&middot;</span>
          <span>
            Points: <strong>{previewDotsRef.current.length || countExpectedPoints(config.gridSize, config.shape)} coordinates</strong>
          </span>
          <span>&middot;</span>
          <span style={{ color: "var(--color-rank-good)", fontWeight: 700 }}>● Ready to Scan</span>
        </div>
      </div>
    </div>
  );
};

function countExpectedPoints(gridSize: GridSize, shape: GridShape): number {
  if (shape === "square") return gridSize * gridSize;
  const half = Math.floor(gridSize / 2);
  let count = 0;
  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      if (Math.sqrt(row * row + col * col) <= half * 1.02) count++;
    }
  }
  return count;
}
