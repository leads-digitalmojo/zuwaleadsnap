import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import { getDb } from "../lib/db.js";
import { computeCompetitors } from "../lib/competitors.js";

// ─── Share link ───────────────────────────────────────────────────────────────

export function createShareHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "id required" }); return; }

  const db = getDb();
  const scan = db.prepare("SELECT id FROM scans WHERE id = ?").get(String(id));
  if (!scan) { res.status(404).json({ error: `Scan ${id} not found` }); return; }

  // Reuse existing token if one already exists
  const existing = db.prepare("SELECT token FROM scan_shares WHERE scan_id = ?").get(String(id)) as { token: string } | undefined;
  if (existing) {
    res.json({ token: existing.token, url: `/report/${existing.token}` });
    return;
  }

  const token = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO scan_shares (token, scan_id) VALUES (?, ?)").run(token, String(id));
  res.status(201).json({ token, url: `/report/${token}` });
}

interface ShareRow {
  scan_id: number;
}

export function getReportHandler(req: Request, res: Response): void {
  const token = typeof req.params["token"] === "string" ? req.params["token"] : "";
  if (!token) { res.status(400).json({ error: "token required" }); return; }

  const db = getDb();
  const share = db.prepare("SELECT scan_id FROM scan_shares WHERE token = ?").get(token) as ShareRow | undefined;
  if (!share) { res.status(404).json({ error: "Report not found or link expired" }); return; }

  // Return the full scan data the same way GET /scan/:id does
  const scan = db.prepare(`
    SELECT s.*, b.name AS business_name, b.place_id, b.address
    FROM scans s LEFT JOIN businesses b ON b.id = s.business_id
    WHERE s.id = ?
  `).get(String(share.scan_id)) as Record<string, unknown> | undefined;

  if (!scan) { res.status(404).json({ error: "Scan not found" }); return; }

  const rawPoints = db.prepare(
    "SELECT * FROM scan_points WHERE scan_id = ? ORDER BY point_index ASC"
  ).all(String(share.scan_id)) as Array<Record<string, unknown>>;

  const competitors = computeCompetitors(share.scan_id);

  res.json({ scan, points: rawPoints, competitors, shareToken: token });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function csvExportHandler(req: Request, res: Response): void {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "id required" }); return; }

  const db = getDb();
  const scan = db.prepare(`
    SELECT s.*, b.name AS business_name FROM scans s
    LEFT JOIN businesses b ON b.id = s.business_id WHERE s.id = ?
  `).get(String(id)) as Record<string, unknown> | undefined;

  if (!scan) { res.status(404).json({ error: `Scan ${id} not found` }); return; }

  const points = db.prepare(
    "SELECT * FROM scan_points WHERE scan_id = ? ORDER BY point_index ASC"
  ).all(String(id)) as Array<Record<string, unknown>>;

  const competitors = computeCompetitors(id);

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines: string[] = [];

  // Scan summary header
  lines.push("SCAN SUMMARY");
  lines.push(`Business,${escape(scan["business_name"])}`);
  lines.push(`Keyword,${escape(scan["keyword"])}`);
  lines.push(`Status,${escape(scan["status"])}`);
  lines.push(`Grid Size,${escape(scan["grid_size"])}x${escape(scan["grid_size"])}`);
  lines.push(`Shape,${escape(scan["shape"])}`);
  lines.push(`Spacing (km),${escape(scan["spacing_km"])}`);
  lines.push(`Center Lat,${escape(scan["center_lat"])}`);
  lines.push(`Center Lng,${escape(scan["center_lng"])}`);
  lines.push(`Total Points,${escape(scan["total_points"])}`);
  lines.push(`Created At,${new Date((scan["created_at"] as number) * 1000).toISOString()}`);
  lines.push("");

  // Grid points
  lines.push("GRID POINTS");
  lines.push("Point #,Lat,Lng,Rank,Cache Hit,Top Result,Top Result Rank");
  for (const p of points) {
    let topName = "";
    let topRank = "";
    try {
      const arr = JSON.parse(String(p["top_results"] ?? "[]")) as Array<{ name: string; rank: number }>;
      if (arr[0]) { topName = arr[0].name; topRank = String(arr[0].rank); }
    } catch { /* skip */ }
    lines.push([
      Number(p["point_index"]) + 1,
      escape(p["lat"]), escape(p["lng"]),
      p["rank"] ?? "not ranked",
      p["cache_hit"] === 1 ? "Yes" : "No",
      escape(topName), topRank,
    ].join(","));
  }
  lines.push("");

  // Competitor leaderboard
  if (competitors.length > 0) {
    lines.push("COMPETITOR LEADERBOARD");
    lines.push("Rank,Business,Avg Rank,Top-3 %,Visibility Points");
    competitors.forEach((c, i) => {
      lines.push([i + 1, escape(c.name), c.avgRank, c.top3Pct, c.totalPoints].join(","));
    });
  }

  const csv = lines.join("\r\n");
  const businessSlug = String(scan["business_name"] ?? "scan").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
  const filename = `zuwa_${businessSlug}_scan${id}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function pdfExportHandler(req: Request, res: Response): Promise<void> {
  const rawId = req.params["id"];
  const id = parseInt(typeof rawId === "string" ? rawId : "", 10);
  if (isNaN(id) || id <= 0) { res.status(400).json({ error: "id required" }); return; }

  // Check scan exists first
  const db = getDb();
  const scan = db.prepare("SELECT id, status FROM scans WHERE id = ?").get(String(id)) as { id: number; status: string } | undefined;
  if (!scan) { res.status(404).json({ error: `Scan ${id} not found` }); return; }
  if (scan.status !== "complete") { res.status(400).json({ error: "Scan is not complete yet" }); return; }

  // Get or create share token so the report page is accessible
  let token: string;
  const existing = db.prepare("SELECT token FROM scan_shares WHERE scan_id = ?").get(String(id)) as { token: string } | undefined;
  if (existing) {
    token = existing.token;
  } else {
    token = randomBytes(16).toString("hex");
    db.prepare("INSERT INTO scan_shares (token, scan_id) VALUES (?, ?)").run(token, String(id));
  }

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    const port = process.env["PORT"] ?? "4000";
    await page.goto(`http://localhost:${port}/api/report-html/${token}`, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" } });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="zuwa_scan_${id}.pdf"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(500).json({ error: `PDF generation failed: ${(err as Error).message}` });
  }
}

// ─── HTML report page (rendered by Puppeteer for PDF, also browseable) ────────

export function reportHtmlHandler(req: Request, res: Response): void {
  const token = typeof req.params["token"] === "string" ? req.params["token"] : "";
  if (!token) { res.status(400).send("Missing token"); return; }

  const db = getDb();
  const share = db.prepare("SELECT scan_id FROM scan_shares WHERE token = ?").get(token) as { scan_id: number } | undefined;
  if (!share) { res.status(404).send("Report not found"); return; }

  const scan = db.prepare(`
    SELECT s.*, b.name AS business_name FROM scans s
    LEFT JOIN businesses b ON b.id = s.business_id WHERE s.id = ?
  `).get(String(share.scan_id)) as Record<string, unknown> | undefined;
  if (!scan) { res.status(404).send("Scan not found"); return; }

  const points = db.prepare(
    "SELECT * FROM scan_points WHERE scan_id = ? ORDER BY point_index ASC"
  ).all(String(share.scan_id)) as Array<Record<string, unknown>>;

  const competitors = computeCompetitors(share.scan_id).slice(0, 20);

  const ranked = points.filter((p) => p["rank"] != null);
  const avgRank = ranked.length > 0
    ? (ranked.reduce((s, p) => s + (p["rank"] as number), 0) / ranked.length).toFixed(1)
    : "—";

  function rankColor(rank: unknown) {
    if (rank == null || Number(rank) > 10) return "#ef4444";
    if (Number(rank) <= 3) return "#22c55e";
    return "#eab308";
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Zuwa Rank Report — ${scan["business_name"]} / ${scan["keyword"]}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a2e; margin: 0; padding: 0; background: #fff; }
  .header { background: #1e2a4a; color: #fff; padding: 24px 32px; }
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .header .sub { font-size: 13px; opacity: 0.65; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; margin-left: 10px; }
  .badge-complete { background: #22c55e; color: #fff; }
  .body { padding: 24px 32px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
  .stat-card .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
  .stat-card .value { font-size: 24px; font-weight: 800; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 10px; border-bottom: 2px solid #e5e7eb; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  .rank-pill { display: inline-block; padding: 1px 7px; border-radius: 100px; font-size: 11px; font-weight: 700; color: #fff; }
  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
  .grid-display { display: grid; gap: 4px; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="header">
  <h1>${scan["business_name"]}
    <span class="badge badge-complete">${scan["status"]}</span>
  </h1>
  <div class="sub">Keyword: <strong>${scan["keyword"]}</strong> &nbsp;·&nbsp; ${scan["grid_size"]}×${scan["grid_size"]} ${scan["shape"]} grid &nbsp;·&nbsp; ${scan["spacing_km"]}km spacing &nbsp;·&nbsp; ${new Date((scan["created_at"] as number) * 1000).toLocaleDateString()}</div>
</div>
<div class="body">
  <div class="summary">
    <div class="stat-card"><div class="label">Total Points</div><div class="value">${scan["total_points"]}</div></div>
    <div class="stat-card"><div class="label">Ranked Points</div><div class="value">${ranked.length}</div></div>
    <div class="stat-card"><div class="label">Avg Rank</div><div class="value">${avgRank}</div></div>
    <div class="stat-card"><div class="label">Competitors</div><div class="value">${competitors.length}+</div></div>
  </div>

  <h2>Grid Results</h2>
  <table>
    <thead><tr><th>Point</th><th>Lat</th><th>Lng</th><th>Rank</th><th>Top Result</th></tr></thead>
    <tbody>
      ${points.map((p) => {
        let topName = "—";
        try {
          const arr = JSON.parse(String(p["top_results"] ?? "[]")) as Array<{ name: string; rank: number }>;
          if (arr[0]) topName = `${arr[0].name} (#${arr[0].rank})`;
        } catch { /* skip */ }
        const rank = p["rank"];
        return `<tr>
          <td>${Number(p["point_index"]) + 1}</td>
          <td>${Number(p["lat"]).toFixed(5)}</td>
          <td>${Number(p["lng"]).toFixed(5)}</td>
          <td><span class="rank-pill" style="background:${rankColor(rank)}">${rank ?? "—"}</span></td>
          <td>${topName}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  ${competitors.length > 0 ? `
  <h2>Top Competitors</h2>
  <table>
    <thead><tr><th>#</th><th>Business</th><th>Avg Rank</th><th>Top-3 %</th><th>Points</th></tr></thead>
    <tbody>
      ${competitors.map((c, i) => `<tr>
        <td>${i + 1}</td>
        <td>${c.name}</td>
        <td style="font-weight:600;color:${c.avgRank <= 3 ? "#22c55e" : c.avgRank <= 10 ? "#eab308" : "#ef4444"}">${c.avgRank.toFixed(1)}</td>
        <td>${c.top3Pct}%</td>
        <td>${c.totalPoints}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  ` : ""}

  <div class="footer">Generated by Zuwa Grid Rank Tracker &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}
