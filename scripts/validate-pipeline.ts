/**
 * Phase 0 — DataForSEO pipeline validation script.
 *
 * Run with: npx tsx scripts/validate-pipeline.ts
 *
 * Edit the TEST_CONFIG block below to change the business, keyword, and center
 * coordinates. Everything else is driven from that block.
 */

import * as dotenv from "dotenv";
import * as https from "https";

dotenv.config();

// ─── Test configuration ───────────────────────────────────────────────────────

const TEST_CONFIG = {
  businessName: "Radiant Plumbing & Air Conditioning",
  keyword: "plumber near me",
  centerLat: 30.2672, // Austin, TX
  centerLng: -97.7431,
  /** Number of grid points per side (e.g. 3 → 3×3 = 9 points). */
  gridSize: 3 as 3 | 5,
  /** Spacing between grid points in km. */
  spacingKm: 1.0,
};

// ─── DataForSEO queue identity and pricing (as of mid-2025) ─────────────────
// Endpoint: /v3/serp/google/maps/task_post  →  Standard (async) queue.
// Live endpoint would be /v3/serp/google/maps/live/advanced (3× more expensive).
// Standard Google Maps: 0.6 SERP API credits × $0.001 = $0.0006 per task.
const DFS_QUEUE = "Standard (async)" as const;
const COST_PER_TASK_USD = 0.0006;

// ─── DataForSEO auth ─────────────────────────────────────────────────────────

const DFS_LOGIN = process.env["DATAFORSEO_LOGIN"];
const DFS_PASSWORD = process.env["DATAFORSEO_PASSWORD"];

if (!DFS_LOGIN || !DFS_PASSWORD) {
  console.error(
    "ERROR: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in .env"
  );
  process.exit(1);
}

const DFS_AUTH = Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString("base64");

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Offset a latitude by `km` kilometres. */
function offsetLat(lat: number, km: number): number {
  return lat + km / 110.574;
}

/** Offset a longitude by `km` kilometres (depends on latitude). */
function offsetLng(lat: number, lng: number, km: number): number {
  return lng + km / (111.32 * Math.cos((lat * Math.PI) / 180));
}

interface GridPoint {
  index: number;
  lat: number;
  lng: number;
}

/**
 * Generate a square grid of lat/lng points centred on (centerLat, centerLng).
 * gridSize must be odd so there is a true centre point.
 */
function generateGrid(
  centerLat: number,
  centerLng: number,
  gridSize: number,
  spacingKm: number
): GridPoint[] {
  const half = Math.floor(gridSize / 2);
  const points: GridPoint[] = [];
  let index = 0;
  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const lat = offsetLat(centerLat, row * spacingKm);
      const lng = offsetLng(centerLat, centerLng, col * spacingKm);
      points.push({ index: index++, lat, lng });
    }
  }
  return points;
}

/** Simple HTTPS JSON request helper (no extra deps beyond what's installed). */
function dfsRequest<T>(
  method: "POST" | "GET",
  path: string,
  body?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const options: https.RequestOptions = {
      hostname: "api.dataforseo.com",
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Basic ${DFS_AUTH}`,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data) as T;
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse JSON response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);

    if (payload) req.write(payload);
    req.end();
  });
}

/** Sleep for `ms` milliseconds. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── DataForSEO types ─────────────────────────────────────────────────────────

interface DfsTaskResponse {
  status_code: number;
  status_message: string;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
  }>;
}

interface DfsTasksReadyResponse {
  status_code: number;
  tasks?: Array<{
    id: string;
    result?: Array<{ id: string }>;
  }>;
}

interface DfsMapsItem {
  type: string;
  rank_group?: number;
  title?: string;
  rating?: { value?: number };
  rating_count?: number;
}

interface DfsTaskResultResponse {
  status_code: number;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result?: Array<{
      items?: DfsMapsItem[];
    }>;
  }>;
}

// ─── Phase 0 logic ───────────────────────────────────────────────────────────

async function submitTasks(points: GridPoint[], keyword: string): Promise<string[]> {
  console.log(`\nSubmitting ${points.length} tasks to DataForSEO Standard queue...`);

  const taskPayload = points.map((p) => ({
    keyword,
    location_coordinate: `${p.lat.toFixed(7)},${p.lng.toFixed(7)},9z`,
    language_code: "en",
    depth: 20, // fetch top 20 results
    tag: `grid-point-${p.index}`,
  }));

  const response = await dfsRequest<DfsTaskResponse>(
    "POST",
    "/v3/serp/google/maps/task_post",
    taskPayload
  );

  if (response.status_code !== 20000 && response.status_code !== 20100) {
    throw new Error(
      `Task submission failed: [${response.status_code}] ${response.status_message}`
    );
  }

  const taskIds: string[] = [];
  for (const task of response.tasks ?? []) {
    // 20100 = Task Created (queued), 20101 = Task Created (already queued) — both are success
    if (task.status_code === 20100 || task.status_code === 20101) {
      taskIds.push(task.id);
    } else {
      console.warn(
        `  Warning: task ${task.id} returned status [${task.status_code}] ${task.status_message}`
      );
    }
  }

  console.log(`  Submitted ${taskIds.length}/${points.length} tasks successfully.`);
  return taskIds;
}

async function pollUntilReady(
  expectedTaskIds: Set<string>,
  timeoutMs = 300_000,
  pollIntervalMs = 5_000
): Promise<string[]> {
  console.log("\nPolling for completed tasks (Standard queue, may take 1-3 min)...");
  const deadline = Date.now() + timeoutMs;
  const completedIds = new Set<string>();

  while (Date.now() < deadline) {
    const response = await dfsRequest<DfsTasksReadyResponse>(
      "GET",
      "/v3/serp/google/maps/tasks_ready"
    );

    if (response.status_code !== 20000 || !response.tasks) {
      // No tasks ready yet or transient error — keep polling
      process.stdout.write(".");
      await sleep(pollIntervalMs);
      continue;
    }

    for (const wrapper of response.tasks) {
      for (const entry of wrapper.result ?? []) {
        if (expectedTaskIds.has(entry.id)) completedIds.add(entry.id);
      }
    }

    process.stdout.write(
      `\r  Ready: ${completedIds.size}/${expectedTaskIds.size}    `
    );

    if (completedIds.size === expectedTaskIds.size) {
      console.log("\n  All tasks ready.");
      return Array.from(completedIds);
    }

    await sleep(pollIntervalMs);
  }

  const missing = [...expectedTaskIds].filter((id) => !completedIds.has(id));
  throw new Error(
    `Timed out after ${timeoutMs / 1000}s. Still waiting on ${missing.length} task(s): ${missing.slice(0, 3).join(", ")}...`
  );
}

interface PointResult {
  point: GridPoint;
  rank: number | null;
  topResults: Array<{ rank: number; name: string; rating: number | null; reviews: number | null }>;
  error?: string;
}

async function fetchResult(
  taskId: string,
  point: GridPoint,
  targetName: string
): Promise<PointResult> {
  const response = await dfsRequest<DfsTaskResultResponse>(
    "GET",
    `/v3/serp/google/maps/task_get/advanced/${taskId}`
  );

  if (response.status_code !== 20000) {
    return {
      point,
      rank: null,
      topResults: [],
      error: `API error: [${response.status_code}]`,
    };
  }

  const task = response.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    return {
      point,
      rank: null,
      topResults: [],
      error: `Task error: [${task?.status_code ?? "?"}] ${task?.status_message ?? "unknown"}`,
    };
  }

  const items: DfsMapsItem[] = task.result?.[0]?.items ?? [];
  const mapItems = items.filter((i) => i.type === "maps_search");

  const topResults = mapItems
    .filter((i) => i.rank_group != null)
    .sort((a, b) => (a.rank_group ?? 99) - (b.rank_group ?? 99))
    .map((i) => ({
      rank: i.rank_group ?? 0,
      name: i.title ?? "(unknown)",
      rating: i.rating?.value ?? null,
      reviews: i.rating_count ?? null,
    }));

  const normalizeForMatch = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const targetNorm = normalizeForMatch(targetName);
  const matched = topResults.find((r) =>
    normalizeForMatch(r.name).includes(targetNorm) ||
    targetNorm.includes(normalizeForMatch(r.name))
  );

  return {
    point,
    rank: matched?.rank ?? null,
    topResults,
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const { businessName, keyword, centerLat, centerLng, gridSize, spacingKm } =
    TEST_CONFIG;

  console.log("═══════════════════════════════════════════════════════");
  console.log(" Zuwa Grid Rank Tracker — Phase 0 Pipeline Validation");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Business : ${businessName}`);
  console.log(`Keyword  : ${keyword}`);
  console.log(`Center   : ${centerLat}, ${centerLng}`);
  console.log(`Grid     : ${gridSize}×${gridSize} (${gridSize * gridSize} points, ${spacingKm} km spacing)`);

  const points = generateGrid(centerLat, centerLng, gridSize, spacingKm);
  console.log(`\nGenerated ${points.length} grid points:`);
  for (const p of points) {
    console.log(`  [${p.index}] ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
  }

  // Submit all tasks
  let taskIds: string[];
  try {
    taskIds = await submitTasks(points, keyword);
  } catch (err) {
    console.error("\nFATAL: Failed to submit tasks to DataForSEO:");
    console.error((err as Error).message);
    process.exit(1);
  }

  if (taskIds.length === 0) {
    console.error("\nFATAL: No tasks were accepted by DataForSEO. Check credentials and account balance.");
    process.exit(1);
  }

  // Build a map: taskId → GridPoint using the tag field ordering
  // DataForSEO preserves task order in the response array, so we can zip by position.
  // (task_post returns tasks in submission order)
  const taskToPoint = new Map<string, GridPoint>();
  taskIds.forEach((id, i) => {
    const point = points[i];
    if (point) taskToPoint.set(id, point);
  });

  // Poll until all ready
  let readyIds: string[];
  try {
    readyIds = await pollUntilReady(new Set(taskIds));
  } catch (err) {
    console.error("\nFATAL: Polling timed out or failed:");
    console.error((err as Error).message);
    process.exit(1);
  }

  // Fetch results
  console.log("\nFetching results...");
  const results: PointResult[] = [];
  for (const taskId of readyIds) {
    const point = taskToPoint.get(taskId) ?? { index: -1, lat: 0, lng: 0 };
    try {
      const result = await fetchResult(taskId, point, businessName);
      results.push(result);
    } catch (err) {
      results.push({
        point,
        rank: null,
        topResults: [],
        error: `Fetch error: ${(err as Error).message}`,
      });
    }
    // Small delay to be polite to the API
    await sleep(200);
  }

  // Sort by point index for clean display
  results.sort((a, b) => a.point.index - b.point.index);

  // Print results table
  console.log("\n");
  console.log("─────────────────────────────────────────────────────────────────");
  console.log(
    " #  │ Latitude   │ Longitude   │ Rank of Target Business"
  );
  console.log("─────────────────────────────────────────────────────────────────");

  for (const r of results) {
    const rankStr = r.error
      ? `ERROR: ${r.error}`
      : r.rank !== null
      ? `#${r.rank}`
      : "not found in top 20";

    console.log(
      ` ${String(r.point.index + 1).padStart(2)} │ ${r.point.lat.toFixed(5)} │ ${r.point.lng.toFixed(6)} │ ${rankStr}`
    );

    if (!r.error && r.topResults.length > 0) {
      const top3 = r.topResults.slice(0, 3);
      for (const t of top3) {
        const stars = t.rating != null ? `★${t.rating}` : "no rating";
        const reviews = t.reviews != null ? `(${t.reviews} reviews)` : "";
        console.log(`     │             │             │   [${t.rank}] ${t.name} — ${stars} ${reviews}`);
      }
    }
  }

  console.log("─────────────────────────────────────────────────────────────────");

  const totalCalls = taskIds.length;
  const estimatedCost = totalCalls * COST_PER_TASK_USD;
  const found = results.filter((r) => r.rank !== null).length;
  const errors = results.filter((r) => !!r.error).length;

  console.log(`\nSummary:`);
  console.log(`  Queue          : ${DFS_QUEUE}`);
  console.log(`  API calls made : ${totalCalls}`);
  console.log(`  Estimated cost : $${estimatedCost.toFixed(4)} USD  ($${COST_PER_TASK_USD}/task)`);
  console.log(`  Points with rank found : ${found}/${results.length}`);
  if (errors > 0) {
    console.log(`  Points with errors     : ${errors}/${results.length}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\nUnhandled error:", err);
  process.exit(1);
});
