import axios, { AxiosError } from "axios";
import { getDb } from "./db.js";
import { logCost } from "./costLogger.js";

const TTL_DAYS = 30;
const TTL_NULL_DAYS = 1;

// Standard queue: $0.06/task flat, up to 1,000 keywords per task
const COST_PER_TASK_USD = 0.06;

const KW_BASE = "https://api.dataforseo.com";
const POLL_INTERVAL_MS = 15_000;
const TIMEOUT_MS = 900_000; // 15 minutes

function getAuth(): string {
  const login = process.env["DATAFORSEO_LOGIN"];
  const password = process.env["DATAFORSEO_PASSWORD"];
  if (!login || !password) throw new Error("DataForSEO credentials not set");
  return Buffer.from(`${login}:${password}`).toString("base64");
}

function authHeader() {
  return {
    Authorization: `Basic ${getAuth()}`,
    "Content-Type": "application/json",
  };
}

function cacheKey(keyword: string, location: string): string {
  const kw = keyword.toLowerCase().trim().replace(/\s+/g, "_");
  const loc = location.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  return `kv:${kw}:${loc}`;
}

export interface KeywordMetrics {
  keyword: string;
  searchVolume: number | null;
  competition: number | null; // 0–1
  cpc: number | null;         // USD
}

interface DfsCachedRow {
  search_vol: number | null;
  competition: number | null;
  cpc: number | null;
}

export interface DfsKwResult {
  keyword?: string;
  search_volume?: number | null;
  competition_index?: number | null; // 0–100
  cpc?: number | null;
}

interface DfsKwTaskPostResponse {
  status_code: number;
  status_message: string;
  cost?: number;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
    cost?: number;
  }>;
}

interface DfsKwTasksReadyResponse {
  status_code: number;
  tasks?: Array<{
    id: string;
    result?: Array<{ id: string }>;
  }>;
}

interface DfsKwTaskGetResponse {
  status_code: number;
  tasks?: Array<{
    id: string;
    status_code: number;
    cost?: number;
    result?: DfsKwResult[] | null;
  }>;
}

/** Submit keywords to the Standard async queue; returns task ID + actual cost. */
async function submitKwTask(
  keywords: string[],
  location: string
): Promise<{ taskId: string; cost: number }> {
  const res = await axios.post<DfsKwTaskPostResponse>(
    `${KW_BASE}/v3/keywords_data/google_ads/search_volume/task_post`,
    [{ keywords, location_name: location || "United States", language_name: "English" }],
    { headers: authHeader(), timeout: 30_000 }
  );

  const response = res.data;
  if (response.status_code !== 20000 && response.status_code !== 20100) {
    throw new Error(`DataForSEO KW task_post error [${response.status_code}]: ${response.status_message}`);
  }

  const task = response.tasks?.[0];
  if (!task) throw new Error("DataForSEO KW: no task in task_post response");
  if (task.status_code !== 20100 && task.status_code !== 20101) {
    throw new Error(`DataForSEO KW task rejected [${task.status_code}]: ${task.status_message}`);
  }

  return {
    taskId: task.id,
    cost: task.cost ?? response.cost ?? COST_PER_TASK_USD,
  };
}

/** Poll tasks_ready until the task ID appears or timeout. */
async function pollKwReady(taskId: string): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const res = await axios.get<DfsKwTasksReadyResponse>(
      `${KW_BASE}/v3/keywords_data/google_ads/search_volume/tasks_ready`,
      { headers: authHeader(), timeout: 30_000 }
    ).catch(() => null);

    if (!res) continue;

    for (const wrapper of res.data.tasks ?? []) {
      for (const entry of wrapper.result ?? []) {
        if (entry.id === taskId) return;
      }
    }
  }

  throw new Error(`DataForSEO KW polling timed out after ${TIMEOUT_MS / 1000}s for task ${taskId}`);
}

/** Fetch results for a completed keyword task. */
async function fetchKwResults(taskId: string): Promise<DfsKwResult[]> {
  const res = await axios.get<DfsKwTaskGetResponse>(
    `${KW_BASE}/v3/keywords_data/google_ads/search_volume/task_get/${taskId}`,
    { headers: authHeader(), timeout: 30_000 }
  );

  return res.data.tasks?.[0]?.result ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getKeywordMetrics(
  keywords: string[],
  location = "United States"
): Promise<KeywordMetrics[]> {
  if (keywords.length === 0) return [];

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const results = new Map<string, KeywordMetrics>();
  const missing: string[] = [];

  // Check cache first
  for (const kw of keywords) {
    const key = cacheKey(kw, location);
    const row = db
      .prepare(
        "SELECT search_vol, competition, cpc FROM keyword_data_cache WHERE cache_key = ? AND expires_at > ?"
      )
      .get(key, now) as DfsCachedRow | undefined;

    if (row) {
      logCost({ vendor: "dataforseo_kw", callType: "search_volume", costUsd: 0, cacheHit: true, meta: { keyword: kw } });
      results.set(kw, {
        keyword: kw,
        searchVolume: row.search_vol,
        competition: row.competition,
        cpc: row.cpc,
      });
    } else {
      missing.push(kw);
    }
  }

  if (missing.length === 0) {
    return keywords.map((kw) => results.get(kw)!);
  }

  try {
    // All missing keywords in a single Standard task (up to 1,000)
    const { taskId, cost } = await submitKwTask(missing, location);

    logCost({
      vendor: "dataforseo_kw",
      callType: "search_volume",
      costUsd: cost,
      cacheHit: false,
      meta: { taskId, keywordCount: missing.length, keywords: missing, queue: "Standard" },
    });

    await pollKwReady(taskId);
    const rows = await fetchKwResults(taskId);

    const upsert = db.prepare(`
      INSERT INTO keyword_data_cache (cache_key, keyword, location, search_vol, competition, cpc, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        search_vol  = excluded.search_vol,
        competition = excluded.competition,
        cpc         = excluded.cpc,
        fetched_at  = unixepoch(),
        expires_at  = excluded.expires_at
    `);

    db.transaction(() => {
      for (const row of rows) {
        if (!row.keyword) continue;
        const compIndex = row.competition_index;
        const m: KeywordMetrics = {
          keyword: row.keyword,
          searchVolume: row.search_volume ?? null,
          competition: compIndex != null ? compIndex / 100 : null,
          cpc: row.cpc ?? null,
        };
        const ttl = m.searchVolume != null ? TTL_DAYS : TTL_NULL_DAYS;
        upsert.run(cacheKey(row.keyword, location), row.keyword, location, m.searchVolume, m.competition, m.cpc, now + ttl * 86400);
        results.set(row.keyword, m);
      }
      // Null-fill any keywords DataForSEO didn't return
      for (const kw of missing) {
        if (!results.has(kw)) {
          upsert.run(cacheKey(kw, location), kw, location, null, null, null, now + TTL_NULL_DAYS * 86400);
          results.set(kw, { keyword: kw, searchVolume: null, competition: null, cpc: null });
        }
      }
    })();
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    console.error(`[keywordsData] DataForSEO Standard queue error: ${msg}`);
    for (const kw of missing) {
      if (!results.has(kw)) {
        results.set(kw, { keyword: kw, searchVolume: null, competition: null, cpc: null });
      }
    }
  }

  return keywords.map(
    (kw) => results.get(kw) ?? { keyword: kw, searchVolume: null, competition: null, cpc: null }
  );
}
