import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";

interface CostRow {
  vendor: string;
  call_type: string;
  total_cost: number;
  call_count: number;
  cache_hits: number;
}

interface WindowRow {
  window: string;
  total_cost: number;
  call_count: number;
}

export function costsSummaryHandler(_req: Request, res: Response): void {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const day = 86_400;

  // Total spend grouped by vendor + call_type (all time)
  const byVendorType = db.prepare(`
    SELECT vendor, call_type, SUM(cost_usd) AS total_cost, COUNT(*) AS call_count,
           SUM(cache_hit) AS cache_hits
    FROM api_cost_log
    GROUP BY vendor, call_type
    ORDER BY total_cost DESC
  `).all() as CostRow[];

  // Rollup by vendor only
  const byVendor = db.prepare(`
    SELECT vendor, SUM(cost_usd) AS total_cost, COUNT(*) AS call_count,
           SUM(cache_hit) AS cache_hits
    FROM api_cost_log
    GROUP BY vendor
    ORDER BY total_cost DESC
  `).all() as CostRow[];

  // Time windows
  const windows = db.prepare(`
    SELECT
      CASE
        WHEN ts >= ? THEN '24h'
        WHEN ts >= ? THEN '7d'
        ELSE '30d'
      END AS window,
      SUM(cost_usd) AS total_cost,
      COUNT(*) AS call_count
    FROM api_cost_log
    WHERE ts >= ?
    GROUP BY window
  `).all(now - day, now - 7 * day, now - 30 * day) as WindowRow[];

  // Cache hit rates by vendor (for rows that are real API calls, not cache hits)
  const cacheRates = db.prepare(`
    SELECT vendor,
           SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS hits,
           SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) AS misses
    FROM api_cost_log
    GROUP BY vendor
  `).all() as Array<{ vendor: string; hits: number; misses: number }>;

  const cacheRateMap: Record<string, { hitRate: string; hits: number; misses: number }> = {};
  for (const row of cacheRates) {
    const total = row.hits + row.misses;
    cacheRateMap[row.vendor] = {
      hitRate: total > 0 ? `${((row.hits / total) * 100).toFixed(1)}%` : "n/a",
      hits: row.hits,
      misses: row.misses,
    };
  }

  // Grand total
  const grandTotal = (db.prepare(`
    SELECT SUM(cost_usd) AS total FROM api_cost_log WHERE cache_hit = 0
  `).get() as { total: number | null })?.total ?? 0;

  res.json({
    grandTotalUsd: parseFloat(grandTotal.toFixed(6)),
    note: "google_places costs logged as $0 — rate not hardcoded, check GCP console",
    byVendor: byVendor.map((r) => ({
      vendor: r.vendor,
      totalUsd: parseFloat((r.total_cost ?? 0).toFixed(6)),
      callCount: r.call_count,
      cacheHits: r.cache_hits,
      cacheHitRate: cacheRateMap[r.vendor]?.hitRate ?? "n/a",
    })),
    byCallType: byVendorType.map((r) => ({
      vendor: r.vendor,
      callType: r.call_type,
      totalUsd: parseFloat((r.total_cost ?? 0).toFixed(6)),
      callCount: r.call_count,
      cacheHits: r.cache_hits,
    })),
    timeWindows: {
      "24h": windows.find((w) => w.window === "24h") ?? { total_cost: 0, call_count: 0 },
      "7d": windows.find((w) => w.window === "7d") ?? { total_cost: 0, call_count: 0 },
      "30d": windows.find((w) => w.window === "30d") ?? { total_cost: 0, call_count: 0 },
    },
  });
}
