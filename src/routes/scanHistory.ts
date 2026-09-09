import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";

export function businessKeywordsHandler(req: Request, res: Response): void {
  const placeId = typeof req.query["placeId"] === "string" ? req.query["placeId"].trim() : "";
  const businessName = typeof req.query["name"] === "string" ? req.query["name"].trim() : "";

  if (!placeId && !businessName) {
    res.status(400).json({ error: "placeId or name required" });
    return;
  }

  const db = getDb();

  // Match by place_id if available, else by name (case-insensitive)
  const rows = db.prepare(`
    SELECT
      s.keyword,
      s.id AS scan_id,
      s.created_at,
      s.total_points,
      (SELECT COUNT(*) FROM scan_points sp WHERE sp.scan_id = s.id AND sp.rank IS NOT NULL) AS ranked_points
    FROM scans s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.status = 'complete'
      AND (
        (? != '' AND b.place_id = ?)
        OR (? != '' AND LOWER(b.name) = LOWER(?))
      )
    ORDER BY s.keyword, s.created_at DESC
  `).all(placeId, placeId, businessName, businessName) as Array<{
    keyword: string;
    scan_id: number;
    created_at: number;
    total_points: number;
    ranked_points: number;
  }>;

  // One entry per keyword — most recent scan (already sorted desc, so first wins)
  const seen = new Set<string>();
  const keywords = rows
    .filter((r) => { const k = r.keyword.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => ({
      keyword: r.keyword,
      scanId: r.scan_id,
      createdAt: new Date(r.created_at * 1000).toISOString(),
      totalPoints: r.total_points,
      rankedPoints: r.ranked_points,
    }));

  res.json({ keywords });
}

interface ScanListRow {
  id: number;
  business_name: string;
  place_id: string | null;
  keyword: string;
  grid_size: number;
  shape: string;
  spacing_km: number;
  center_lat: number;
  center_lng: number;
  total_points: number;
  status: string;
  created_at: number;
  completed_at: number | null;
  ranked_points: number;
}

export function scanHistoryHandler(req: Request, res: Response): void {
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "50"), 10), 200);
  const offset = Math.max(parseInt(String(req.query["offset"] ?? "0"), 10), 0);
  const businessFilter = typeof req.query["business"] === "string" ? req.query["business"].trim() : null;

  const db = getDb();

  const where = businessFilter ? "WHERE LOWER(b.name) LIKE ?" : "";
  const params: (string | number)[] = businessFilter ? [`%${businessFilter.toLowerCase()}%`] : [];

  const rows = db.prepare(`
    SELECT
      s.id, b.name AS business_name, b.place_id,
      s.keyword, s.grid_size, s.shape, s.spacing_km,
      s.center_lat, s.center_lng, s.total_points,
      s.status, s.created_at, s.completed_at,
      (SELECT COUNT(*) FROM scan_points sp WHERE sp.scan_id = s.id AND sp.rank IS NOT NULL) AS ranked_points
    FROM scans s
    LEFT JOIN businesses b ON b.id = s.business_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ScanListRow[];

  const total = (db.prepare(`
    SELECT COUNT(*) AS cnt FROM scans s LEFT JOIN businesses b ON b.id = s.business_id ${where}
  `).get(...params) as { cnt: number }).cnt;

  res.json({
    total,
    limit,
    offset,
    scans: rows.map((r) => ({
      id: r.id,
      businessName: r.business_name,
      placeId: r.place_id,
      keyword: r.keyword,
      gridConfig: {
        gridSize: r.grid_size,
        shape: r.shape,
        spacingKm: r.spacing_km,
        centerLat: r.center_lat,
        centerLng: r.center_lng,
      },
      totalPoints: r.total_points,
      rankedPoints: r.ranked_points,
      status: r.status,
      createdAt: new Date(r.created_at * 1000).toISOString(),
      completedAt: r.completed_at ? new Date(r.completed_at * 1000).toISOString() : null,
    })),
  });
}
