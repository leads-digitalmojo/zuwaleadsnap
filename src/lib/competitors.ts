import { getDb } from "./db.js";

export interface CompetitorStat {
  placeId: string;
  name: string;
  totalPoints: number;         // how many grid points it appeared in
  avgRank: number;             // average rank across all appearances
  top3Pct: number;             // % of total grid points where it ranked 1-3
  top10Pct: number;            // % of total grid points where it ranked 4-10
}

interface ScanPointRow {
  top_results: string;
  total_points: number;
}

interface TopResult {
  name: string;
  rank: number;
  placeId: string | null;
}

export function computeCompetitors(scanId: number): CompetitorStat[] {
  const db = getDb();

  const scan = db.prepare("SELECT total_points FROM scans WHERE id = ?").get(String(scanId)) as { total_points: number } | undefined;
  if (!scan) return [];
  const totalGridPoints = scan.total_points;

  const rows = db.prepare(
    "SELECT top_results FROM scan_points WHERE scan_id = ? AND top_results IS NOT NULL AND top_results != '[]'"
  ).all(String(scanId)) as ScanPointRow[];

  // Accumulate per-competitor stats across all grid points
  const stats = new Map<string, { name: string; ranks: number[]; appearances: number }>();

  for (const row of rows) {
    let items: TopResult[] = [];
    try {
      const parsed: unknown = JSON.parse(row.top_results);
      if (Array.isArray(parsed)) items = parsed as TopResult[];
    } catch { continue; }

    for (const item of items) {
      const key = item.placeId || `name:${item.name.toLowerCase().replace(/\s+/g, "_")}`;
      const existing = stats.get(key);
      if (existing) {
        existing.ranks.push(item.rank);
        existing.appearances++;
      } else {
        stats.set(key, { name: item.name, ranks: [item.rank], appearances: 1 });
      }
    }
  }

  const result: CompetitorStat[] = [];

  for (const [placeId, s] of stats.entries()) {
    const avgRank = s.ranks.reduce((a, b) => a + b, 0) / s.ranks.length;
    const top3Count = s.ranks.filter((r) => r <= 3).length;
    const top10Count = s.ranks.filter((r) => r >= 4 && r <= 10).length;

    result.push({
      placeId: placeId.startsWith("name:") ? "" : placeId,
      name: s.name,
      totalPoints: s.appearances,
      avgRank: parseFloat(avgRank.toFixed(2)),
      top3Pct: parseFloat(((top3Count / totalGridPoints) * 100).toFixed(1)),
      top10Pct: parseFloat(((top10Count / totalGridPoints) * 100).toFixed(1)),
    });
  }

  // Sort by avg rank ascending (best performers first)
  return result.sort((a, b) => a.avgRank - b.avgRank);
}
