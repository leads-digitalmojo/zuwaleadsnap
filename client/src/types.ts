export interface Business {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface TopResult {
  name: string;
  rank: number;
  rating: number | null;
  reviews: number | null;
  placeId: string | null;
  cid?: string | null;
  address?: string | null;
  phone?: string | null;
  url?: string | null;
  category?: string | null;
  mainImage?: string | null;
}

export interface CompetitorStat {
  placeId: string;
  name: string;
  totalPoints: number;
  foundIn: string;
  foundInPct: number;
  avgRank: number;
  atgr: number;
  top3Points: number;
  top3Pct: number;
  top10Points: number;
  top10Pct: number;
  marketShare: number;
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
  pointRanks: Record<number, number>;
}

export interface ScanPoint {
  index: number;
  lat: number;
  lng: number;
  rank: number | null;
  cacheHit: boolean;
  topResults: TopResult[];
}

// Shape of GET /scan/:id response
export interface ScanResponse {
  id: number;
  status: "running" | "complete" | "error";
  error: string | null;
  business: {
    name: string;
    placeId: string | null;
    address: string | null;
  };
  keyword: string;
  gridConfig: {
    centerLat: number;
    centerLng: number;
    gridSize: number;
    shape: string;
    spacingKm: number;
  };
  createdAt: string;
  completedAt: string | null;
  points: ScanPoint[];
  stats: {
    totalPoints: number;
    pointsComplete: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    // LeadSnap Parity Metrics
    agr?: number | null;
    atgr?: number;
    top3Points?: number;
    top3Pct?: number;
    top10Points?: number;
    top10Pct?: number;
    marketShare?: number;
    areaKm2?: number;
    betweenPointsMeters?: number;
    quadrants?: {
      northWest: number | null;
      northEast: number | null;
      southWest: number | null;
      southEast: number | null;
    };
  };
}

// Shape of POST /scan response
export interface ScanCreateResponse {
  scanId: number;
  status: "running";
  totalPoints: number;
  cachedPoints: number;
  missPoints: number;
  estimatedCostUsd: number;
  pollUrl: string;
}

export type GridSize = 3 | 5 | 7 | 9 | 11 | 13 | 15;
export type GridShape = "square" | "circle";

export interface GridConfig {
  gridSize: GridSize;
  shape: GridShape;
  spacingValue: number;
  unit: "km" | "mi";
}

// 4a — keyword search volume data
export interface KeywordMetrics {
  keyword: string;
  searchVolume: number | null;
  competition: number | null;
  cpc: number | null;
}

// 4b — saved keyword lists
export interface KeywordList {
  id: number;
  name: string;
  businessId: number | null;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

// 4c — scheduled scans
export interface Schedule {
  id: number;
  name: string;
  businessId: number;
  businessName: string | null;
  keyword: string;
  gridConfig: {
    centerLat: number;
    centerLng: number;
    gridSize: number;
    shape: string;
    spacingKm: number;
  };
  recurrence: "weekly" | "monthly";
  nextRunAt: string;
  lastRunAt: string | null;
  lastScanId: number | null;
  isActive: boolean;
  createdAt: string;
}

// 4d — scan history list item
export interface ScanListItem {
  id: number;
  businessName: string;
  placeId: string | null;
  keyword: string;
  gridConfig: {
    gridSize: number;
    shape: string;
    spacingKm: number;
    centerLat: number;
    centerLng: number;
  };
  totalPoints: number;
  rankedPoints: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export type AppPage = "new-scan" | "history" | "schedules" | "scan-detail";
