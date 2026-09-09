import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";

interface ScheduleRow {
  id: number;
  name: string;
  business_id: number;
  keyword: string;
  center_lat: number;
  center_lng: number;
  grid_size: number;
  shape: string;
  spacing_km: number;
  recurrence: string;
  next_run_at: number;
  last_run_at: number | null;
  last_scan_id: number | null;
  is_active: number;
  created_at: number;
  business_name: string | null;
}

function formatRow(r: ScheduleRow) {
  return {
    id: r.id,
    name: r.name,
    businessId: r.business_id,
    businessName: r.business_name ?? null,
    keyword: r.keyword,
    gridConfig: {
      centerLat: r.center_lat,
      centerLng: r.center_lng,
      gridSize: r.grid_size,
      shape: r.shape,
      spacingKm: r.spacing_km,
    },
    recurrence: r.recurrence,
    nextRunAt: new Date(r.next_run_at * 1000).toISOString(),
    lastRunAt: r.last_run_at ? new Date(r.last_run_at * 1000).toISOString() : null,
    lastScanId: r.last_scan_id,
    isActive: r.is_active === 1,
    createdAt: new Date(r.created_at * 1000).toISOString(),
  };
}

export function listSchedulesHandler(_req: Request, res: Response): void {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.*, b.name AS business_name
    FROM scheduled_scans s
    LEFT JOIN businesses b ON b.id = s.business_id
    ORDER BY s.next_run_at ASC
  `).all() as ScheduleRow[];

  res.json({ schedules: rows.map(formatRow) });
}

export async function createScheduleHandler(req: Request, res: Response): Promise<void> {
  const b = req.body as {
    name?: unknown;
    businessName?: unknown;
    keyword?: unknown;
    centerLat?: unknown;
    centerLng?: unknown;
    gridSize?: unknown;
    shape?: unknown;
    spacingKm?: unknown;
    recurrence?: unknown;
  };

  const errors: string[] = [];
  if (typeof b.name !== "string" || !b.name.trim()) errors.push("name required");
  if (typeof b.businessName !== "string" || !b.businessName.trim()) errors.push("businessName required");
  if (typeof b.keyword !== "string" || !b.keyword.trim()) errors.push("keyword required");
  if (typeof b.centerLat !== "number") errors.push("centerLat required");
  if (typeof b.centerLng !== "number") errors.push("centerLng required");
  if (![5, 7, 13].includes(b.gridSize as number)) errors.push("gridSize must be 5, 7, or 13");
  if (b.shape !== "square" && b.shape !== "circle") errors.push("shape must be square or circle");
  if (typeof b.spacingKm !== "number" || (b.spacingKm as number) <= 0) errors.push("spacingKm must be positive");
  if (b.recurrence !== "weekly" && b.recurrence !== "monthly") errors.push("recurrence must be weekly or monthly");

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  const db = getDb();

  // Upsert business
  const existingBiz = db.prepare("SELECT id FROM businesses WHERE name = ?").get((b.businessName as string).trim()) as { id: number } | undefined;
  let businessId: number;
  if (existingBiz) {
    businessId = existingBiz.id;
  } else {
    const ins = db.prepare("INSERT INTO businesses (name) VALUES (?)").run((b.businessName as string).trim());
    businessId = ins.lastInsertRowid as number;
  }

  const now = Math.floor(Date.now() / 1000);
  const recurrence = b.recurrence as "weekly" | "monthly";
  const nextRunAt = now + (recurrence === "weekly" ? 7 * 86400 : 30 * 86400);

  const result = db.prepare(`
    INSERT INTO scheduled_scans
      (name, business_id, keyword, center_lat, center_lng, grid_size, shape, spacing_km, recurrence, next_run_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    (b.name as string).trim(),
    businessId,
    (b.keyword as string).trim(),
    b.centerLat,
    b.centerLng,
    b.gridSize,
    b.shape,
    b.spacingKm,
    recurrence,
    nextRunAt
  );

  res.status(201).json({ id: result.lastInsertRowid, nextRunAt: new Date(nextRunAt * 1000).toISOString() });
}

export function toggleScheduleHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "id: must be a positive integer" });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    "UPDATE scheduled_scans SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?"
  ).run(String(id));

  if (result.changes === 0) {
    res.status(404).json({ error: `Schedule ${id} not found` });
    return;
  }

  const row = db.prepare("SELECT is_active FROM scheduled_scans WHERE id = ?").get(String(id)) as { is_active: number };
  res.json({ id, isActive: row.is_active === 1 });
}

export function deleteScheduleHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "id: must be a positive integer" });
    return;
  }

  const db = getDb();
  const result = db.prepare("DELETE FROM scheduled_scans WHERE id = ?").run(String(id));
  if (result.changes === 0) {
    res.status(404).json({ error: `Schedule ${id} not found` });
    return;
  }
  res.json({ deleted: id });
}
