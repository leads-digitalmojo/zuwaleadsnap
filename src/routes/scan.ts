import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";
import { generateGrid, isValidGridSize, isValidShape } from "../lib/grid.js";
import { getCached } from "../lib/serpCache.js";
import { createScanRecord, runScan } from "../lib/scanner.js";
import { COST_PER_TASK_USD } from "../lib/dataforseo.js";

// ── POST /scan ────────────────────────────────────────────────────────────────

interface ScanBody {
  businessName?: unknown;
  keyword?: unknown;
  centerLat?: unknown;
  centerLng?: unknown;
  gridSize?: unknown;
  shape?: unknown;
  spacingKm?: unknown;
}

function validCoord(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && isFinite(v) && v >= min && v <= max;
}

export async function postScanHandler(req: Request, res: Response): Promise<void> {
  const b = req.body as ScanBody;
  const errors: string[] = [];

  if (typeof b.businessName !== "string" || b.businessName.trim() === "")
    errors.push("businessName: required non-empty string");
  if (typeof b.keyword !== "string" || b.keyword.trim() === "")
    errors.push("keyword: required non-empty string");
  if (!validCoord(b.centerLat, -90, 90))
    errors.push("centerLat: required number between -90 and 90");
  if (!validCoord(b.centerLng, -180, 180))
    errors.push("centerLng: required number between -180 and 180");
  if (!isValidGridSize(b.gridSize))
    errors.push("gridSize: must be 5, 7, or 13");
  if (!isValidShape(b.shape))
    errors.push("shape: must be 'square' or 'circle'");
  if (typeof b.spacingKm !== "number" || b.spacingKm <= 0 || b.spacingKm > 50)
    errors.push("spacingKm: required positive number ≤ 50");

  if (errors.length > 0) {
    res.status(400).json({ error: "Invalid request", details: errors });
    return;
  }

  const businessName = (b.businessName as string).trim();
  const keyword = (b.keyword as string).trim();
  const centerLat = b.centerLat as number;
  const centerLng = b.centerLng as number;
  const gridSize = b.gridSize as 5 | 7 | 13;
  const shape = b.shape as "square" | "circle";
  const spacingKm = b.spacingKm as number;

  const points = generateGrid(centerLat, centerLng, gridSize, shape, spacingKm);
  if (points.length === 0) {
    res.status(400).json({ error: "Grid produced 0 points. Check gridSize/shape/spacingKm." });
    return;
  }

  // Count cache hits up-front so the response is informative
  let cachedPoints = 0;
  for (const p of points) {
    if (getCached(p.lat, p.lng, keyword)) cachedPoints++;
  }
  const missCount = points.length - cachedPoints;
  const estimatedCostUsd = missCount * COST_PER_TASK_USD;

  // Create DB records synchronously
  let scanRecord: Awaited<ReturnType<typeof createScanRecord>>;
  try {
    scanRecord = await createScanRecord(
      businessName, keyword, centerLat, centerLng,
      gridSize, shape, spacingKm, points,
      req.user?.id ?? null,
      req.user?.email ?? null
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to create scan record", details: (err as Error).message });
    return;
  }

  const { scanId, targetPlaceId, targetName } = scanRecord;

  // Start scan in background — do not await
  void runScan({
    scanId,
    businessName,
    keyword,
    centerLat,
    centerLng,
    points,
    targetPlaceId,
    targetName,
  });

  res.status(202).json({
    scanId,
    status: "running",
    totalPoints: points.length,
    cachedPoints,
    missPoints: missCount,
    estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(4)),
    pollUrl: `/scan/${scanId}`,
  });
}

// ── GET /scan/:id ─────────────────────────────────────────────────────────────

export function getScanHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "id: must be a positive integer" });
    return;
  }

  const db = getDb();

  const scan = db.prepare(`
    SELECT s.*, b.name AS business_name, b.place_id, b.address
    FROM scans s
    LEFT JOIN businesses b ON b.id = s.business_id
    WHERE s.id = ?
  `).get(id) as ScanRow | undefined;

  if (!scan) {
    res.status(404).json({ error: `Scan ${id} not found` });
    return;
  }

  // RBAC check: Normal users can only view their own scans (or legacy unassigned scans)
  if (req.user && req.user.role !== "admin") {
    if (scan.user_id && scan.user_id !== req.user.id) {
      res.status(403).json({ error: "Access denied: you only have permission to view your own scans." });
      return;
    }
  }

  const rawPoints = db.prepare(`
    SELECT * FROM scan_points WHERE scan_id = ? ORDER BY point_index ASC
  `).all(id) as ScanPointRow[];

  const points = rawPoints.map((p) => ({
    index: p.point_index,
    lat: p.lat,
    lng: p.lng,
    rank: p.rank,
    cacheHit: p.cache_hit === 1,
    topResults: safeParseJson(p.top_results),
  }));

  const completedPoints = points.filter((p) => p.rank !== null || p.topResults.length > 0);
  const cacheHits = rawPoints.filter((p) => p.cache_hit === 1).length;

  res.json({
    id: scan.id,
    status: scan.status,
    error: scan.error ?? null,
    userEmail: scan.user_email ?? null,
    business: {
      name: scan.business_name,
      placeId: scan.place_id ?? null,
      address: scan.address ?? null,
    },
    keyword: scan.keyword,
    gridConfig: {
      centerLat: scan.center_lat,
      centerLng: scan.center_lng,
      gridSize: scan.grid_size,
      shape: scan.shape,
      spacingKm: scan.spacing_km,
    },
    createdAt: new Date(scan.created_at * 1000).toISOString(),
    completedAt: scan.completed_at
      ? new Date(scan.completed_at * 1000).toISOString()
      : null,
    points,
    stats: {
      totalPoints: scan.total_points,
      pointsComplete: completedPoints.length,
      cacheHits,
      cacheMisses: rawPoints.length - cacheHits,
      cacheHitRate:
        rawPoints.length > 0
          ? parseFloat((cacheHits / rawPoints.length).toFixed(3))
          : 0,
    },
  });
}

// ── DB row types ──────────────────────────────────────────────────────────────

interface ScanRow {
  id: number;
  business_id: number;
  keyword: string;
  center_lat: number;
  center_lng: number;
  grid_size: number;
  shape: string;
  spacing_km: number;
  total_points: number;
  status: string;
  error: string | null;
  user_id?: string | null;
  user_email?: string | null;
  created_at: number;
  completed_at: number | null;
  business_name: string;
  place_id: string | null;
  address: string | null;
}

interface ScanPointRow {
  id: number;
  scan_id: number;
  point_index: number;
  lat: number;
  lng: number;
  rank: number | null;
  top_results: string;
  cache_hit: number;
  created_at: number;
}

function safeParseJson(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
