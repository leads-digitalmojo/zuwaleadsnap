import { getDb } from "./db.js";

export interface CompetitorStat {
  placeId: string;
  name: string;
  totalPoints: number;        // how many grid points it appeared in
  foundIn: string;            // e.g. "168/169 (99.4%)"
  foundInPct: number;
  avgRank: number;            // AGR: average rank across all appearances
  atgr: number;               // ATGR: average total grid rank (unranked = 21)
  top3Points: number;         // count of points with rank <= 3
  top3Pct: number;            // % of total grid points where it ranked 1-3
  top10Points: number;        // count of points with rank 1-10
  top10Pct: number;           // % of total grid points where it ranked 1-10
  marketShare: number;        // estimated visibility share
  rating: number | null;
  reviews: number | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  url: string | null;
  northWest: number | null;
  northEast: number | null;
  southWest: number | null;
  southEast: number | null;
  pointRanks: Record<number, number>; // index -> rank for instant Flip-the-Grid
}

interface ScanPointRow {
  point_index: number;
  lat: number;
  lng: number;
  top_results: string;
}

interface TopResult {
  name: string;
  rank: number;
  rating?: number | null;
  reviews?: number | null;
  placeId?: string | null;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  url?: string | null;
}

export function computeCompetitors(scanId: number): CompetitorStat[] {
  const db = getDb();

  const scan = db.prepare(
    "SELECT center_lat, center_lng, total_points FROM scans WHERE id = ?"
  ).get(String(scanId)) as { center_lat: number; center_lng: number; total_points: number } | undefined;

  if (!scan) return [];
  const totalGridPoints = scan.total_points || 1;
  const centerLat = scan.center_lat;
  const centerLng = scan.center_lng;

  const rows = db.prepare(`
    SELECT point_index, lat, lng, top_results
    FROM scan_points
    WHERE scan_id = ? AND top_results IS NOT NULL AND top_results != '[]'
  `).all(String(scanId)) as ScanPointRow[];

  // Accumulate per-competitor stats across all grid points
  interface CompetitorAccumulator {
    name: string;
    placeId: string;
    ranks: number[];
    pointRanks: Record<number, number>;
    quadrants: {
      nw: number[];
      ne: number[];
      sw: number[];
      se: number[];
    };
    rating: number | null;
    reviews: number | null;
    category: string | null;
    address: string | null;
    phone: string | null;
    url: string | null;
  }

  const map = new Map<string, CompetitorAccumulator>();

  for (const row of rows) {
    let items: TopResult[] = [];
    try {
      const parsed: unknown = JSON.parse(row.top_results);
      if (Array.isArray(parsed)) items = parsed as TopResult[];
    } catch {
      continue;
    }

    const isNorth = row.lat >= centerLat;
    const isEast = row.lng >= centerLng;

    for (const item of items) {
      if (!item || !item.name) continue;
      const key = item.placeId || `name:${item.name.toLowerCase().replace(/\s+/g, "_")}`;
      let comp = map.get(key);

      if (!comp) {
        comp = {
          name: item.name,
          placeId: item.placeId || "",
          ranks: [],
          pointRanks: {},
          quadrants: { nw: [], ne: [], sw: [], se: [] },
          rating: item.rating ?? null,
          reviews: item.reviews ?? null,
          category: item.category ?? null,
          address: item.address ?? null,
          phone: item.phone ?? null,
          url: item.url ?? null,
        };
        map.set(key, comp);
      }

      // Record rank for this point
      comp.ranks.push(item.rank);
      comp.pointRanks[row.point_index] = item.rank;

      // Quadrant allocation
      if (isNorth && !isEast) comp.quadrants.nw.push(item.rank);
      else if (isNorth && isEast) comp.quadrants.ne.push(item.rank);
      else if (!isNorth && !isEast) comp.quadrants.sw.push(item.rank);
      else comp.quadrants.se.push(item.rank);

      // Backfill metadata if missing
      if (!comp.rating && item.rating) comp.rating = item.rating;
      if (!comp.reviews && item.reviews) comp.reviews = item.reviews;
      if (!comp.category && item.category) comp.category = item.category;
      if (!comp.address && item.address) comp.address = item.address;
      if (!comp.phone && item.phone) comp.phone = item.phone;
      if (!comp.url && item.url) comp.url = item.url;
    }
  }

  const avgOf = (arr: number[]): number | null =>
    arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

  const result: CompetitorStat[] = [];

  for (const [, comp] of map.entries()) {
    const appearances = comp.ranks.length;
    const avgRank = appearances > 0 ? comp.ranks.reduce((a, b) => a + b, 0) / appearances : 21;

    // LeadSnap ATGR formula: unranked points count as 21
    const unrankedCount = Math.max(0, totalGridPoints - appearances);
    const sumAllPoints = comp.ranks.reduce((a, b) => a + b, 0) + unrankedCount * 21;
    const atgr = sumAllPoints / totalGridPoints;

    const top3Count = comp.ranks.filter((r) => r <= 3).length;
    const top10Count = comp.ranks.filter((r) => r <= 10).length;

    const foundInPct = parseFloat(((appearances / totalGridPoints) * 100).toFixed(1));
    const top3Pct = parseFloat(((top3Count / totalGridPoints) * 100).toFixed(1));
    const top10Pct = parseFloat(((top10Count / totalGridPoints) * 100).toFixed(1));

    // Market share: weighted proportion of top-3 and top-10 dominance
    const marketShare = parseFloat(
      Math.min(100, (top3Count * 3 + (top10Count - top3Count)) / (totalGridPoints * 0.03)).toFixed(1)
    );

    result.push({
      placeId: comp.placeId,
      name: comp.name,
      totalPoints: appearances,
      foundIn: `${appearances}/${totalGridPoints} (${foundInPct}%)`,
      foundInPct,
      avgRank: parseFloat(avgRank.toFixed(2)),
      atgr: parseFloat(atgr.toFixed(2)),
      top3Points: top3Count,
      top3Pct,
      top10Points: top10Count,
      top10Pct,
      marketShare: isNaN(marketShare) ? 0 : marketShare,
      rating: comp.rating,
      reviews: comp.reviews,
      category: comp.category,
      address: comp.address,
      phone: comp.phone,
      url: comp.url,
      northWest: avgOf(comp.quadrants.nw),
      northEast: avgOf(comp.quadrants.ne),
      southWest: avgOf(comp.quadrants.sw),
      southEast: avgOf(comp.quadrants.se),
      pointRanks: comp.pointRanks,
    });
  }

  // Sort by ATGR ascending (lower is better, matching LeadSnap's best overall ranking)
  return result.sort((a, b) => a.atgr - b.atgr || a.avgRank - b.avgRank);
}
