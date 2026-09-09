import cron from "node-cron";
import { getDb } from "./db.js";
import { generateGrid } from "./grid.js";
import { createScanRecord, runScan } from "./scanner.js";

interface ScheduleRow {
  id: number;
  business_id: number;
  business_name: string;
  keyword: string;
  center_lat: number;
  center_lng: number;
  grid_size: number;
  shape: "square" | "circle";
  spacing_km: number;
  recurrence: "weekly" | "monthly";
  next_run_at: number;
}

async function runDueSchedules(): Promise<void> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const due = db.prepare(`
    SELECT ss.*, b.name AS business_name
    FROM scheduled_scans ss
    JOIN businesses b ON b.id = ss.business_id
    WHERE ss.is_active = 1 AND ss.next_run_at <= ?
  `).all(now) as ScheduleRow[];

  if (due.length === 0) return;
  console.log(`[scheduler] ${due.length} scheduled scan(s) due, running now…`);

  for (const schedule of due) {
    try {
      const shape = schedule.shape === "circle" ? "circle" : "square";
      const gridSize = [5, 7, 13].includes(schedule.grid_size) ? schedule.grid_size as 5 | 7 | 13 : 7;
      const points = generateGrid(schedule.center_lat, schedule.center_lng, gridSize, shape, schedule.spacing_km);

      const { scanId, targetPlaceId, targetName } = await createScanRecord(
        schedule.business_name,
        schedule.keyword,
        schedule.center_lat,
        schedule.center_lng,
        gridSize,
        shape,
        schedule.spacing_km,
        points
      );

      // Fire and forget the scan
      void runScan({ scanId, businessName: schedule.business_name, keyword: schedule.keyword, centerLat: schedule.center_lat, centerLng: schedule.center_lng, points, targetPlaceId, targetName });

      // Calculate next run
      const intervalSec = schedule.recurrence === "weekly" ? 7 * 86400 : 30 * 86400;
      db.prepare(`
        UPDATE scheduled_scans
        SET last_run_at = ?, last_scan_id = ?, next_run_at = ?
        WHERE id = ?
      `).run(now, scanId, now + intervalSec, schedule.id);

      console.log(`[scheduler] started scan ${scanId} for schedule ${schedule.id} (${schedule.business_name} / ${schedule.keyword})`);
    } catch (err) {
      console.error(`[scheduler] schedule ${schedule.id} failed:`, (err as Error).message);
    }
  }
}

export function startScheduler(): void {
  // Check for due scans every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    void runDueSchedules();
  });
  console.log("[scheduler] started — checking for due scans every 5 minutes");
}
