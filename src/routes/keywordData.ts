import type { Request, Response } from "express";
import { getKeywordMetrics } from "../lib/keywordsData.js";

interface KwVolumeBody {
  keywords?: unknown;
  location?: unknown;
}

export async function keywordVolumeHandler(req: Request, res: Response): Promise<void> {
  const b = req.body as KwVolumeBody;

  if (!Array.isArray(b.keywords) || b.keywords.length === 0) {
    res.status(400).json({ error: "keywords: required non-empty array of strings" });
    return;
  }

  const keywords = b.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  if (keywords.length === 0) {
    res.status(400).json({ error: "keywords: all items must be non-empty strings" });
    return;
  }

  const location = typeof b.location === "string" && b.location.trim() ? b.location.trim() : "United States";

  try {
    const metrics = await getKeywordMetrics(keywords, location);
    res.json({ metrics, location });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
