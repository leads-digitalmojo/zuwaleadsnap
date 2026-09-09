export interface GridPoint {
  index: number;
  lat: number;
  lng: number;
}

export type GridSize = 5 | 7 | 13;
export type GridShape = "square" | "circle";

const VALID_GRID_SIZES: GridSize[] = [5, 7, 13];

export function isValidGridSize(n: unknown): n is GridSize {
  return VALID_GRID_SIZES.includes(n as GridSize);
}

export function isValidShape(s: unknown): s is GridShape {
  return s === "square" || s === "circle";
}

/**
 * Generate a square or circular grid of lat/lng points centred on (centerLat, centerLng).
 * gridSize must be odd (5, 7, 13) so there is a true centre point.
 * Circle shape filters out points beyond floor(gridSize/2) × spacingKm from centre.
 */
export function generateGrid(
  centerLat: number,
  centerLng: number,
  gridSize: GridSize,
  shape: GridShape,
  spacingKm: number
): GridPoint[] {
  const half = Math.floor(gridSize / 2);
  const radiusKm = half * spacingKm;
  const points: GridPoint[] = [];

  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const lat = centerLat + (row * spacingKm) / 110.574;
      const lng =
        centerLng +
        (col * spacingKm) / (111.32 * Math.cos((centerLat * Math.PI) / 180));

      if (shape === "circle") {
        const distKm = haversineKm(centerLat, centerLng, lat, lng);
        // Tolerance = 2% of radius so haversine rounding doesn't clip boundary points
        if (distKm > radiusKm * 1.02) continue;
      }

      points.push({ index: points.length, lat, lng });
    }
  }

  return points;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
