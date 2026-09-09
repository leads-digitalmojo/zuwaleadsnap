/**
 * Shared SERP cache.
 *
 * Cache key: "{lat4dp}:{lng4dp}:{keyword_slug}:google_maps"
 * Precision:  4 decimal places ≈ 11 m — no false collisions for any spacing ≥ 0.1 km.
 * TTL:        SERP_CACHE_TTL_DAYS env var (default 7 days).
 */

import { getDb } from "./db.js";
import type { DfsMapsItem } from "./dataforseo.js";
import { logCost } from "./costLogger.js";

const TTL_DAYS = parseInt(process.env["SERP_CACHE_TTL_DAYS"] ?? "7", 10);
const TTL_SECONDS = TTL_DAYS * 86_400;
const PRECISION = 4; // decimal places for cache key rounding

export interface CacheEntry {
  items: DfsMapsItem[];
  fromCache: true;
}

function buildKey(lat: number, lng: number, keyword: string): string {
  const latR = lat.toFixed(PRECISION);
  const lngR = lng.toFixed(PRECISION);
  const kw = keyword.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return `${latR}:${lngR}:${kw}:google_maps`;
}

/** Returns cached SERP items if a fresh entry exists, null otherwise. */
export function getCached(
  lat: number,
  lng: number,
  keyword: string
): DfsMapsItem[] | null {
  const db = getDb();
  const key = buildKey(lat, lng, keyword);
  const now = Math.floor(Date.now() / 1000);

  const row = db
    .prepare(
      "SELECT raw_items FROM serp_cache WHERE cache_key = ? AND expires_at > ?"
    )
    .get(key, now) as { raw_items: string } | undefined;

  if (!row) return null;

  logCost({
    vendor: "dataforseo_serp",
    callType: "maps_task_post",
    costUsd: 0,
    cacheHit: true,
    meta: { keyword, lat: parseFloat(lat.toFixed(PRECISION)), lng: parseFloat(lng.toFixed(PRECISION)) },
  });

  return JSON.parse(row.raw_items) as DfsMapsItem[];
}

/** Stores raw SERP items in the cache, upserting on conflict. */
export function storeCache(
  lat: number,
  lng: number,
  keyword: string,
  items: DfsMapsItem[]
): void {
  const db = getDb();
  const key = buildKey(lat, lng, keyword);
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO serp_cache (cache_key, keyword, lat_rounded, lng_rounded, raw_items, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      raw_items  = excluded.raw_items,
      created_at = unixepoch(),
      expires_at = excluded.expires_at
  `).run(
    key,
    keyword,
    parseFloat(lat.toFixed(PRECISION)),
    parseFloat(lng.toFixed(PRECISION)),
    JSON.stringify(items),
    now + TTL_SECONDS
  );
}

/** Delete expired entries. Call periodically if needed. */
export function purgeExpired(): number {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .prepare("DELETE FROM serp_cache WHERE expires_at <= ?")
    .run(now);
  return result.changes;
}
