import type { Request, Response } from "express";
import { resolveBusiness } from "../lib/places.js";
import { checkRankAtPoint, COST_PER_TASK_USD, DFS_QUEUE } from "../lib/dataforseo.js";

interface RankCheckBody {
  businessName?: unknown;
  keyword?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

function validCoord(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && isFinite(v) && v >= min && v <= max;
}

export async function rankCheckHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as RankCheckBody;

  // ── Input validation ──────────────────────────────────────────────────────
  const errors: string[] = [];

  if (typeof body.businessName !== "string" || body.businessName.trim() === "") {
    errors.push("businessName: required non-empty string");
  }
  if (typeof body.keyword !== "string" || body.keyword.trim() === "") {
    errors.push("keyword: required non-empty string");
  }
  if (!validCoord(body.latitude, -90, 90)) {
    errors.push("latitude: required number between -90 and 90");
  }
  if (!validCoord(body.longitude, -180, 180)) {
    errors.push("longitude: required number between -180 and 180");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Invalid request", details: errors });
    return;
  }

  const businessName = (body.businessName as string).trim();
  const keyword = (body.keyword as string).trim();
  const latitude = body.latitude as number;
  const longitude = body.longitude as number;

  // ── Resolve business via Google Places ───────────────────────────────────
  let placeId: string | null = null;
  let resolvedName = businessName;

  try {
    const resolved = await resolveBusiness(businessName, latitude, longitude);
    if (resolved) {
      placeId = resolved.placeId;
      resolvedName = resolved.name;
    }
  } catch (err) {
    // Places resolution is best-effort; log and continue with name matching
    console.warn(
      `[rank-check] Google Places resolution failed for "${businessName}":`,
      (err as Error).message
    );
  }

  // ── DataForSEO rank check ─────────────────────────────────────────────────
  const startMs = Date.now();

  let rankResult: Awaited<ReturnType<typeof checkRankAtPoint>>;
  try {
    rankResult = await checkRankAtPoint(keyword, latitude, longitude, placeId, resolvedName);
  } catch (err) {
    const message = (err as Error).message;
    const isTimeout = message.includes("timed out");
    res
      .status(isTimeout ? 504 : 502)
      .json({ error: isTimeout ? "DataForSEO polling timed out" : "DataForSEO error", details: message });
    return;
  }

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);

  res.json({
    rank: rankResult.rank,
    topResults: rankResult.topResults,
    meta: {
      businessName: resolvedName,
      placeIdUsed: placeId,
      keyword,
      latitude,
      longitude,
      queue: DFS_QUEUE,
      costUsd: COST_PER_TASK_USD,
      elapsedSec: parseFloat(elapsedSec),
    },
  });
}
