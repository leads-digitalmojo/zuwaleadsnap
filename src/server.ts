import "dotenv/config";
import express from "express";
import { rankCheckHandler } from "./routes/rankCheck.js";
import { postScanHandler, getScanHandler } from "./routes/scan.js";
import { suggestKeywordsHandler } from "./routes/keywords.js";
import { placesSearchHandler } from "./routes/placesSearch.js";
import { keywordVolumeHandler } from "./routes/keywordData.js";
import { listKeywordListsHandler, createKeywordListHandler, deleteKeywordListHandler } from "./routes/keywordLists.js";
import { listSchedulesHandler, createScheduleHandler, toggleScheduleHandler, deleteScheduleHandler } from "./routes/schedules.js";
import { scanHistoryHandler, businessKeywordsHandler } from "./routes/scanHistory.js";
import { competitorsHandler } from "./routes/competitors.js";
import { createShareHandler, getReportHandler, csvExportHandler, pdfExportHandler, reportHtmlHandler } from "./routes/export.js";
import { costsSummaryHandler } from "./routes/costs.js";
import { getDb } from "./lib/db.js";
import { startScheduler } from "./lib/scheduler.js";
import { optionalAuth, requireAuth } from "./lib/auth.js";

const app = express();
app.use(express.json());

// Initialise DB on startup (creates tables if needed)
getDb();
startScheduler();

// ── Public Routes (No Auth Required) ──────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public share token report viewing
app.get("/api/report/:token", getReportHandler);
app.get("/api/report-html/:token", reportHtmlHandler);

// Public maps configuration (provides Google Maps JS API key safely at runtime)
app.get("/api/config/maps-key", (_req, res) => {
  const key = process.env["GOOGLE_MAPS_JS_API_KEY"] ?? process.env["VITE_GOOGLE_MAPS_JS_API_KEY"] ?? "";
  res.json({ key });
});

// Check current user session status
app.get("/api/me", optionalAuth, (req, res) => {
  res.json({ user: req.user ?? null });
});

// ── Protected Routes (Require Valid @digitalmojo.in Supabase Auth) ────────────

app.use(requireAuth);

app.post("/rank-check", rankCheckHandler);
app.post("/scan", postScanHandler);
app.get("/scan/:id", getScanHandler);

app.post("/api/suggest-keywords", suggestKeywordsHandler);
app.get("/api/places/search", placesSearchHandler);
app.post("/api/keywords/volume", keywordVolumeHandler);

app.get("/api/keyword-lists", listKeywordListsHandler);
app.post("/api/keyword-lists", (req, res) => { void createKeywordListHandler(req, res); });
app.delete("/api/keyword-lists/:id", deleteKeywordListHandler);

app.get("/api/schedules", listSchedulesHandler);
app.post("/api/schedules", (req, res) => { void createScheduleHandler(req, res); });
app.patch("/api/schedules/:id/toggle", toggleScheduleHandler);
app.delete("/api/schedules/:id", deleteScheduleHandler);

app.get("/api/scans", scanHistoryHandler);
app.get("/api/business-keywords", businessKeywordsHandler);
app.get("/scan/:id/competitors", competitorsHandler);
app.post("/scan/:id/share", createShareHandler);
app.get("/scan/:id/export/csv", csvExportHandler);
app.get("/scan/:id/export/pdf", (req, res) => { void pdfExportHandler(req, res); });
app.get("/api/costs/summary", costsSummaryHandler);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const port = parseInt(process.env["PORT"] ?? "4000", 10);
const server = app.listen(port, () => {
  console.log(`MojoMap rank API listening on http://localhost:${port}`);
  console.log(`  POST /rank-check            — single-point rank check`);
  console.log(`  POST /scan                  — grid scan (async, returns scanId)`);
  console.log(`  GET  /scan/:id              — poll scan status + results`);
  console.log(`  POST /api/suggest-keywords  — AI keyword suggestions (Anthropic)`);
  console.log(`  GET  /api/places/search     — business search typeahead (Google Places)`);
  console.log(`  GET  /health                — liveness check`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`ERROR: Port ${port} is already in use. Set a different PORT in .env`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
