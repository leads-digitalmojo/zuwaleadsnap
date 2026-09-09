import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";
import { computeCompetitors } from "../lib/competitors.js";

export function competitorsHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "id: must be a positive integer" });
    return;
  }

  const db = getDb();
  const scan = db.prepare("SELECT id, status, total_points FROM scans WHERE id = ?").get(String(id)) as
    | { id: number; status: string; total_points: number }
    | undefined;

  if (!scan) {
    res.status(404).json({ error: `Scan ${id} not found` });
    return;
  }

  if (scan.status === "running") {
    res.json({ scanId: id, status: "running", competitors: [], message: "Scan still in progress" });
    return;
  }

  const competitors = computeCompetitors(id);
  res.json({
    scanId: id,
    totalGridPoints: scan.total_points,
    competitorCount: competitors.length,
    competitors,
  });
}
