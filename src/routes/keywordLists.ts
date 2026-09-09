import type { Request, Response } from "express";
import { getDb } from "../lib/db.js";

interface KwListRow {
  id: number;
  name: string;
  business_id: number | null;
  keywords: string;
  created_at: number;
  updated_at: number;
}

export function listKeywordListsHandler(req: Request, res: Response): void {
  const businessId = typeof req.query["business_id"] === "string"
    ? parseInt(req.query["business_id"], 10)
    : null;

  const db = getDb();
  const rows = businessId != null && !isNaN(businessId)
    ? db.prepare("SELECT * FROM keyword_lists WHERE business_id = ? OR business_id IS NULL ORDER BY updated_at DESC").all(businessId) as KwListRow[]
    : db.prepare("SELECT * FROM keyword_lists ORDER BY updated_at DESC").all() as KwListRow[];

  res.json({
    lists: rows.map((r) => ({
      id: r.id,
      name: r.name,
      businessId: r.business_id,
      keywords: safeParseArray(r.keywords),
      createdAt: new Date(r.created_at * 1000).toISOString(),
      updatedAt: new Date(r.updated_at * 1000).toISOString(),
    })),
  });
}

export async function createKeywordListHandler(req: Request, res: Response): Promise<void> {
  const { name, keywords, businessId } = req.body as {
    name?: unknown;
    keywords?: unknown;
    businessId?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name: required non-empty string" });
    return;
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: "keywords: required non-empty array" });
    return;
  }

  const kwArray = keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  if (kwArray.length === 0) {
    res.status(400).json({ error: "keywords: must contain at least one valid keyword" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO keyword_lists (name, business_id, keywords) VALUES (?, ?, ?)"
    )
    .run(
      name.trim(),
      typeof businessId === "number" ? businessId : null,
      JSON.stringify(kwArray)
    );

  const id = result.lastInsertRowid as number;
  res.status(201).json({ id, name: name.trim(), keywords: kwArray });
}

export function deleteKeywordListHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "id: must be a positive integer" });
    return;
  }

  const db = getDb();
  const result = db.prepare("DELETE FROM keyword_lists WHERE id = ?").run(String(id));
  if (result.changes === 0) {
    res.status(404).json({ error: `Keyword list ${id} not found` });
    return;
  }
  res.json({ deleted: id });
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
