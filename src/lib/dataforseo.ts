/**
 * DataForSEO client — Google Local Pack Standard (async) queue.
 *
 * Queue:    Standard (task_post → tasks_ready → task_get/advanced)
 * Endpoint: /v3/serp/google/local_pack/task_post
 * Cost:     $0.0006 / task  (0.6 credits × $0.001)
 *
 * Local Pack = results shown in Google Search (google.com), not Maps directly.
 * This matches what LeadSnap and other rank trackers use as "Ranking Source: Local Pack".
 */

import axios, { AxiosError } from "axios";
import { logCost } from "./costLogger.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DFS_QUEUE = "Standard (async)" as const;
export const COST_PER_TASK_USD = 0.0006;

const DFS_BASE = "https://api.dataforseo.com";
// Trial accounts: Standard queue can take 10-20 min. Paid accounts: typically 1-3 min.
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 1_200_000; // 20 minutes

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth(): string {
  const login = process.env["DATAFORSEO_LOGIN"];
  const password = process.env["DATAFORSEO_PASSWORD"];
  if (!login || !password) {
    throw new Error(
      "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in environment"
    );
  }
  return Buffer.from(`${login}:${password}`).toString("base64");
}

function dfsClient() {
  return axios.create({
    baseURL: DFS_BASE,
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DfsTaskPostResponse {
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

interface DfsTasksReadyResponse {
  status_code: number;
  // Each element of tasks[] is a wrapper; the actual ready SERP task IDs are in result[]
  tasks?: Array<{
    id: string;
    result?: Array<{ id: string }>;
  }>;
}

export interface DfsMapsItem {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  title?: string;
  place_id?: string;
  address?: string;
  phone?: string;
  url?: string;
  rating?: { value?: number; votes_count?: number };
  rating_count?: number;
  main_image?: string;
}

interface DfsTaskGetResponse {
  status_code: number;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result?: Array<{ items?: DfsMapsItem[] }>;
  }>;
}

// ─── Public result types ──────────────────────────────────────────────────────

export interface TopResult {
  name: string;
  rank: number;
  rating: number | null;
  reviews: number | null;
  placeId: string | null;
}

export interface MapsRankResult {
  rank: number | null;
  topResults: TopResult[];
}

// ─── Core API calls ──────────────────────────────────────────────────────────

/** Submit a single Google Maps SERP task and return its task ID. */
export async function submitMapsTask(
  keyword: string,
  lat: number,
  lng: number,
  tag?: string
): Promise<string> {
  const client = dfsClient();

  let response: DfsTaskPostResponse;
  try {
    const res = await client.post<DfsTaskPostResponse>(
      "/v3/serp/google/local_pack/task_post",
      [
        {
          keyword,
          location_coordinate: `${lat.toFixed(7)},${lng.toFixed(7)},11z`,
          language_code: "en",
          depth: 100,
          ...(tag ? { tag } : {}),
        },
      ]
    );
    response = res.data;
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    throw new Error(`DataForSEO task submission failed: ${msg}`);
  }

  if (response.status_code !== 20000 && response.status_code !== 20100) {
    throw new Error(
      `DataForSEO error [${response.status_code}]: ${response.status_message}`
    );
  }

  const task = response.tasks?.[0];
  if (!task) throw new Error("DataForSEO returned no task in response");

  // 20100 = Task Created (placed in queue), 20101 = Task Created (already queued) — both are success
  if (task.status_code !== 20100 && task.status_code !== 20101) {
    throw new Error(
      `DataForSEO task rejected [${task.status_code}]: ${task.status_message}`
    );
  }

  // Log actual cost from API response (not estimated)
  logCost({
    vendor: "dataforseo_serp",
    callType: "maps_task_post",
    costUsd: task.cost ?? response.cost ?? COST_PER_TASK_USD,
    cacheHit: false,
    meta: { taskId: task.id, keyword, lat, lng },
  });

  return task.id;
}

/** Submit multiple tasks in a single batch and return all accepted task IDs. */
export async function submitMapsTasks(
  points: Array<{ lat: number; lng: number; tag?: string }>,
  keyword: string
): Promise<string[]> {
  const client = dfsClient();

  const payload = points.map((p) => ({
    keyword,
    location_coordinate: `${p.lat.toFixed(7)},${p.lng.toFixed(7)},11z`,
    language_code: "en",
    depth: 100,
    ...(p.tag ? { tag: p.tag } : {}),
  }));

  let response: DfsTaskPostResponse;
  try {
    const res = await client.post<DfsTaskPostResponse>(
      "/v3/serp/google/local_pack/task_post",
      payload
    );
    response = res.data;
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    throw new Error(`DataForSEO batch submission failed: ${msg}`);
  }

  if (response.status_code !== 20000 && response.status_code !== 20100) {
    throw new Error(
      `DataForSEO error [${response.status_code}]: ${response.status_message}`
    );
  }

  const ids: string[] = [];
  for (const task of response.tasks ?? []) {
    if (task.status_code === 20100 || task.status_code === 20101) {
      ids.push(task.id);
      logCost({
        vendor: "dataforseo_serp",
        callType: "maps_task_post_batch",
        costUsd: task.cost ?? COST_PER_TASK_USD,
        cacheHit: false,
        meta: { taskId: task.id, keyword, batchSize: points.length },
      });
    }
  }
  return ids;
}

/** Poll /tasks_ready until all expected task IDs appear or timeout is reached. */
export async function pollUntilReady(
  expectedIds: Set<string>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
): Promise<string[]> {
  const client = dfsClient();
  const deadline = Date.now() + timeoutMs;
  const completed = new Set<string>();

  while (Date.now() < deadline) {
    try {
      const res = await client.get<DfsTasksReadyResponse>(
        "/v3/serp/google/local_pack/tasks_ready"
      );
      const data = res.data;

      // tasks_ready wraps results: tasks[].result[] holds the actual SERP task IDs
      for (const wrapper of data.tasks ?? []) {
        for (const entry of wrapper.result ?? []) {
          if (expectedIds.has(entry.id)) completed.add(entry.id);
        }
      }

      if (completed.size === expectedIds.size) {
        return Array.from(completed);
      }
    } catch {
      // Transient network error — keep polling
    }

    await sleep(pollIntervalMs);
  }

  const missing = [...expectedIds].filter((id) => !completed.has(id));
  throw new Error(
    `DataForSEO polling timed out after ${timeoutMs / 1000}s. ` +
      `${missing.length} task(s) never completed.`
  );
}

/** Fetch raw result items for a completed task. */
export async function fetchTaskItems(taskId: string): Promise<DfsMapsItem[]> {
  const client = dfsClient();

  let response: DfsTaskGetResponse;
  try {
    const res = await client.get<DfsTaskGetResponse>(
      `/v3/serp/google/local_pack/task_get/advanced/${taskId}`
    );
    response = res.data;
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    throw new Error(`DataForSEO result fetch failed: ${msg}`);
  }

  if (response.status_code !== 20000) {
    throw new Error(
      `DataForSEO error [${response.status_code}] fetching task ${taskId}`
    );
  }

  const task = response.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(
      `DataForSEO task ${taskId} result error [${task?.status_code ?? "?"}]: ${task?.status_message ?? "unknown"}`
    );
  }

  const items = task.result?.[0]?.items ?? [];
  return items.filter((i) => i.type === "local_pack");
}

// ─── Business matching ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Given a list of raw SERP items, find the target business by place_id first,
 * then fall back to fuzzy name matching. Returns structured rank result.
 */
export function extractRankFromItems(
  items: DfsMapsItem[],
  targetPlaceId: string | null,
  targetName: string
): MapsRankResult {
  const ranked = items
    .filter((i) => i.rank_group != null)
    .sort((a, b) => (a.rank_group ?? 99) - (b.rank_group ?? 99));

  const topResults: TopResult[] = ranked.map((i) => ({
    name: i.title ?? "(unknown)",
    rank: i.rank_group ?? 0,
    rating: i.rating?.value ?? null,
    reviews: i.rating?.votes_count ?? i.rating_count ?? null,
    placeId: i.place_id ?? null,
  }));

  let matched: TopResult | undefined;

  // Prefer place_id match (exact, API-authoritative)
  if (targetPlaceId) {
    matched = topResults.find((r) => r.placeId === targetPlaceId);
  }

  // Fall back to normalized name containment match
  if (!matched) {
    const targetNorm = normalize(targetName);
    matched = topResults.find((r) => {
      const rNorm = normalize(r.name);
      return rNorm.includes(targetNorm) || targetNorm.includes(rNorm);
    });
  }

  return { rank: matched?.rank ?? null, topResults };
}

// ─── High-level helper: submit → poll → fetch → match ────────────────────────

/**
 * Full round-trip: submit one task, wait for it, fetch result, return rank.
 * Blocks until the Standard queue completes (typically 30s–2min).
 */
export async function checkRankAtPoint(
  keyword: string,
  lat: number,
  lng: number,
  targetPlaceId: string | null,
  targetName: string
): Promise<MapsRankResult> {
  const taskId = await submitMapsTask(keyword, lat, lng);
  await pollUntilReady(new Set([taskId]));
  const items = await fetchTaskItems(taskId);
  return extractRankFromItems(items, targetPlaceId, targetName);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
