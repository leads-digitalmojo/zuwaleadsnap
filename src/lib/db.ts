import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env["DB_PATH"] ?? path.join(process.cwd(), "zuwa.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      place_id   TEXT,
      address    TEXT,
      lat        REAL,
      lng        REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS scans (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id  INTEGER REFERENCES businesses(id),
      keyword      TEXT    NOT NULL,
      center_lat   REAL    NOT NULL,
      center_lng   REAL    NOT NULL,
      grid_size    INTEGER NOT NULL,
      shape        TEXT    NOT NULL CHECK(shape IN ('square','circle')),
      spacing_km   REAL    NOT NULL,
      total_points INTEGER NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'running'
                           CHECK(status IN ('running','complete','error')),
      error        TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS scan_points (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id     INTEGER NOT NULL REFERENCES scans(id),
      point_index INTEGER NOT NULL,
      lat         REAL    NOT NULL,
      lng         REAL    NOT NULL,
      rank        INTEGER,
      top_results TEXT,
      cache_hit   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_scan_points_scan_id ON scan_points(scan_id);

    -- Shared SERP cache — NOT scoped to a client.
    -- Key: lat/lng rounded to 4dp + normalised keyword + surface.
    -- Raw items JSON lets any business's rank be re-derived without a refetch.
    CREATE TABLE IF NOT EXISTS serp_cache (
      cache_key   TEXT    PRIMARY KEY,
      keyword     TEXT    NOT NULL,
      lat_rounded REAL    NOT NULL,
      lng_rounded REAL    NOT NULL,
      surface     TEXT    NOT NULL DEFAULT 'google_maps',
      raw_items   TEXT    NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_serp_cache_expires ON serp_cache(expires_at);

    -- Keyword search volume cache (DataForSEO Keyword Data API, 30-day TTL)
    CREATE TABLE IF NOT EXISTS keyword_data_cache (
      cache_key   TEXT    PRIMARY KEY,
      keyword     TEXT    NOT NULL,
      location    TEXT    NOT NULL,
      search_vol  INTEGER,
      competition REAL,
      cpc         REAL,
      fetched_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_kw_cache_expires ON keyword_data_cache(expires_at);

    -- Share tokens for public read-only report links
    CREATE TABLE IF NOT EXISTS scan_shares (
      token      TEXT    PRIMARY KEY,
      scan_id    INTEGER NOT NULL REFERENCES scans(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_scan_shares_scan ON scan_shares(scan_id);

    -- API cost log — every external API call, whether cache hit or miss
    CREATE TABLE IF NOT EXISTS api_cost_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          INTEGER NOT NULL DEFAULT (unixepoch()),
      vendor      TEXT    NOT NULL,  -- 'dataforseo_serp' | 'dataforseo_kw' | 'google_places' | 'anthropic'
      call_type   TEXT    NOT NULL,  -- e.g. 'maps_task_post' | 'search_volume' | 'places_search' | 'suggest_keywords'
      cost_usd    REAL    NOT NULL,  -- 0.0 for cache hits
      cache_hit   INTEGER NOT NULL DEFAULT 0,
      meta        TEXT              -- JSON: e.g. token counts for Anthropic, keyword count for DFS
    );

    CREATE INDEX IF NOT EXISTS idx_cost_log_ts ON api_cost_log(ts);
    CREATE INDEX IF NOT EXISTS idx_cost_log_vendor ON api_cost_log(vendor);

    -- Saved keyword lists per business
    CREATE TABLE IF NOT EXISTS keyword_lists (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      business_id INTEGER REFERENCES businesses(id),
      keywords    TEXT    NOT NULL DEFAULT '[]',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_kw_lists_business ON keyword_lists(business_id);

    -- Scheduled recurring scans
    CREATE TABLE IF NOT EXISTS scheduled_scans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      business_id     INTEGER NOT NULL REFERENCES businesses(id),
      keyword         TEXT    NOT NULL,
      center_lat      REAL    NOT NULL,
      center_lng      REAL    NOT NULL,
      grid_size       INTEGER NOT NULL,
      shape           TEXT    NOT NULL,
      spacing_km      REAL    NOT NULL,
      recurrence      TEXT    NOT NULL CHECK(recurrence IN ('weekly','monthly')),
      next_run_at     INTEGER NOT NULL,
      last_run_at     INTEGER,
      last_scan_id    INTEGER REFERENCES scans(id),
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  return _db;
}
