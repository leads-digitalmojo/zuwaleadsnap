/**
 * Core scan runner.
 *
 * Flow per scan:
 *   1. Resolve business via Google Places (best-effort)
 *   2. Generate grid points
 *   3. Check serp_cache for each point  →  split into hits / misses
 *   4. Batch-submit all misses to DataForSEO in one call (≤100/batch)
 *   5. Poll tasks_ready until all submitted tasks complete
 *   6. Fetch each result, store in serp_cache
 *   7. Derive rank (place_id or name match) for all points
 *   8. Store every point in scan_points
 *   9. Mark scan complete
 *
 * Runs entirely in background — POST /scan returns the scan ID immediately.
 */

import { getDb } from "./db.js";
import { getCached, storeCache } from "./serpCache.js";
import { resolveBusiness } from "./places.js";
import {
  submitMapsTasks,
  pollUntilReady,
  fetchTaskItems,
  extractRankFromItems,
  type TopResult,
} from "./dataforseo.js";
import type { GridPoint } from "./grid.js";

const DFS_BATCH_LIMIT = 100;

interface ScanRunOptions {
  scanId: number;
  businessName: string;
  keyword: string;
  centerLat: number;
  centerLng: number;
  points: GridPoint[];
  targetPlaceId: string | null;
  targetName: string;
}

export async function runScan(opts: ScanRunOptions): Promise<void> {
  const db = getDb();
  const { scanId, keyword, points, targetPlaceId, targetName } = opts;

  try {
    // ── 1. Split points into cache hits and misses ───────────────────────────
    const hits: Array<{ point: GridPoint; items: ReturnType<typeof getCached> & {} }> = [];
    const misses: GridPoint[] = [];

    for (const point of points) {
      const cached = getCached(point.lat, point.lng, keyword);
      if (cached) {
        hits.push({ point, items: cached });
      } else {
        misses.push(point);
      }
    }

    console.log(
      `[scan ${scanId}] ${points.length} points: ${hits.length} cache hits, ${misses.length} misses`
    );

    // ── 2. Batch-submit misses to DataForSEO ─────────────────────────────────
    // taskIdToPoint: preserves the mapping after batch submission
    const taskIdToPoint = new Map<string, GridPoint>();

    if (misses.length > 0) {
      // Split into ≤100-item batches (DataForSEO limit per request)
      for (let start = 0; start < misses.length; start += DFS_BATCH_LIMIT) {
        const batch = misses.slice(start, start + DFS_BATCH_LIMIT);
        const batchPayload = batch.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          tag: `scan-${scanId}-point-${p.index}`,
        }));

        const taskIds = await submitMapsTasks(batchPayload, keyword);

        // DataForSEO preserves submission order in the response array
        taskIds.forEach((id, i) => {
          const point = batch[i];
          if (point) taskIdToPoint.set(id, point);
        });
      }

      console.log(
        `[scan ${scanId}] Submitted ${taskIdToPoint.size}/${misses.length} tasks. Polling...`
      );

      // ── 3. Poll until all submitted tasks are ready ────────────────────────
      const readyIds = await pollUntilReady(new Set(taskIdToPoint.keys()));

      // ── 4. Fetch results and populate cache ───────────────────────────────
      for (const taskId of readyIds) {
        const point = taskIdToPoint.get(taskId);
        if (!point) continue;

        try {
          const items = await fetchTaskItems(taskId);
          storeCache(point.lat, point.lng, keyword, items);
          // Re-add to hits so we process it uniformly below
          hits.push({ point, items });
        } catch (err) {
          console.warn(
            `[scan ${scanId}] Failed to fetch task ${taskId} for point ${point.index}:`,
            (err as Error).message
          );
          // Store null rank for this point
          db.prepare(`
            INSERT INTO scan_points (scan_id, point_index, lat, lng, rank, top_results, cache_hit)
            VALUES (?, ?, ?, ?, NULL, '[]', 0)
          `).run(scanId, point.index, point.lat, point.lng);
        }

        await sleep(150); // polite pacing between fetches
      }
    }

    // ── 5. Derive rank for all points (hits + newly fetched) ─────────────────
    const insertPoint = db.prepare(`
      INSERT INTO scan_points (scan_id, point_index, lat, lng, rank, top_results, cache_hit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // missIndices built before any fetching, so it correctly identifies original misses
    const missIndices = new Set(misses.map((p) => p.index));

    const insertMany = db.transaction(
      (rows: Array<{ point: GridPoint; items: NonNullable<ReturnType<typeof getCached>>; wasHit: boolean }>) => {
        for (const { point, items, wasHit } of rows) {
          const { rank, topResults } = extractRankFromItems(
            items,
            targetPlaceId,
            targetName
          );
          insertPoint.run(
            scanId,
            point.index,
            point.lat,
            point.lng,
            rank,
            JSON.stringify(topResults),
            wasHit ? 1 : 0
          );
        }
      }
    );

    insertMany(
      hits.map((h) => ({
        point: h.point,
        items: h.items,
        wasHit: !missIndices.has(h.point.index),
      }))
    );

    // ── 6. Mark scan complete ─────────────────────────────────────────────────
    db.prepare(`
      UPDATE scans SET status = 'complete', completed_at = unixepoch() WHERE id = ?
    `).run(scanId);

    console.log(`[scan ${scanId}] Complete.`);
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[scan ${scanId}] Failed:`, message);
    db.prepare(`
      UPDATE scans SET status = 'error', error = ?, completed_at = unixepoch() WHERE id = ?
    `).run(message, scanId);
  }
}

// ── Business + scan creation helpers ──────────────────────────────────────────

export interface CreateScanResult {
  scanId: number;
  businessId: number;
  targetPlaceId: string | null;
  targetName: string;
}

export async function createScanRecord(
  businessName: string,
  keyword: string,
  centerLat: number,
  centerLng: number,
  gridSize: number,
  shape: string,
  spacingKm: number,
  points: GridPoint[]
): Promise<CreateScanResult> {
  const db = getDb();

  // Resolve business (best-effort)
  let placeId: string | null = null;
  let resolvedName = businessName;

  try {
    const resolved = await resolveBusiness(businessName, centerLat, centerLng);
    if (resolved) {
      placeId = resolved.placeId;
      resolvedName = resolved.name;
    }
  } catch (err) {
    console.warn(
      `[scan] Places resolution failed for "${businessName}":`,
      (err as Error).message
    );
  }

  // Upsert business record (match on place_id if available, else name)
  let businessId: number;
  if (placeId) {
    const existing = db
      .prepare("SELECT id FROM businesses WHERE place_id = ?")
      .get(placeId) as { id: number } | undefined;

    if (existing) {
      businessId = existing.id;
    } else {
      const result = db
        .prepare(
          "INSERT INTO businesses (name, place_id) VALUES (?, ?)"
        )
        .run(resolvedName, placeId);
      businessId = result.lastInsertRowid as number;
    }
  } else {
    const result = db
      .prepare("INSERT INTO businesses (name) VALUES (?)")
      .run(resolvedName);
    businessId = result.lastInsertRowid as number;
  }

  // Create scan record
  const scanResult = db
    .prepare(`
      INSERT INTO scans (business_id, keyword, center_lat, center_lng, grid_size, shape, spacing_km, total_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      businessId,
      keyword,
      centerLat,
      centerLng,
      gridSize,
      shape,
      spacingKm,
      points.length
    );

  return {
    scanId: scanResult.lastInsertRowid as number,
    businessId,
    targetPlaceId: placeId,
    targetName: resolvedName,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
