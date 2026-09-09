import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { BusinessSearchCard } from "./components/BusinessSearchCard";
import { KeywordInputCard } from "./components/KeywordInputCard";
import { GridConfigCard } from "./components/GridConfigCard";
import { ScanResultsMap } from "./components/ScanResultsMap";
import { PreviousKeywordsBar } from "./components/PreviousKeywordsBar";
import { HistoryPage } from "./pages/HistoryPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ReportPage } from "./pages/ReportPage";
import { CompetitorLeaderboard } from "./components/CompetitorLeaderboard";
import { ExportBar } from "./components/ExportBar";
import type { AppPage, Business, GridConfig, ScanCreateResponse, ScanResponse } from "./types";

const DEFAULT_GRID: GridConfig = {
  gridSize: 7,
  shape: "square",
  spacingValue: 1,
  unit: "km",
};

interface ScanStatus {
  phase: "idle" | "running" | "complete" | "error";
  scanId: number | null;
  message: string;
  progressFraction: number;
}

const PAGE_TITLES: Record<AppPage, string> = {
  "new-scan": "New Scan",
  "history": "Scan History",
  "schedules": "Scheduled Scans",
};

export default function App() {
  const [page, setPage] = useState<AppPage>("new-scan");

  // New-scan state
  const [business, setBusiness] = useState<Business | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    phase: "idle", scanId: null, message: "", progressFraction: 0,
  });
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [historyScanId, setHistoryScanId] = useState<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Validation
  const validationErrors: string[] = [];
  if (!business) validationErrors.push("Select a business first (Step 1)");
  if (keywords.length === 0) validationErrors.push("Add at least one keyword (Step 2)");
  const spacingKm = gridConfig.unit === "mi" ? gridConfig.spacingValue * 1.60934 : gridConfig.spacingValue;
  if (spacingKm <= 0 || spacingKm > 50) validationErrors.push("Spacing must be between 0 and 50 km");

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const loadHistoryScan = useCallback(async (scanId: number) => {
    stopPolling();
    setScanStatus({ phase: "idle", scanId: null, message: "", progressFraction: 0 });
    try {
      const res = await fetch(`/scan/${scanId}`);
      if (!res.ok) return;
      const data = (await res.json()) as ScanResponse;
      setScanResult(data);
      setHistoryScanId(scanId);
    } catch { /* ignore */ }
  }, [stopPolling]);

  const pollScan = useCallback(async (scanId: number) => {
    try {
      const res = await fetch(`/scan/${scanId}`);
      if (!res.ok) return;
      const data = (await res.json()) as ScanResponse;
      const total = data.stats.totalPoints;
      const done = data.stats.pointsComplete;

      // Show progressive pins immediately
      setScanResult(data);
      setScanStatus((prev) => ({
        ...prev,
        message: `${done} / ${total} points complete`,
        progressFraction: total > 0 ? done / total : 0,
      }));

      if (data.status === "complete" || data.status === "error") {
        stopPolling();
        setScanStatus((prev) => ({
          ...prev,
          phase: data.status,
          message: data.status === "complete"
            ? `Scan complete — ${total} points`
            : `Scan error: ${data.error ?? "unknown"}`,
          progressFraction: 1,
        }));
      }
    } catch { /* transient network error */ }
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function handleRun() {
    if (!business || keywords.length === 0 || validationErrors.length > 0) return;
    const keyword = keywords[0];
    const centerLat = business.lat ?? 37.7749;
    const centerLng = business.lng ?? -122.4194;

    setScanStatus({ phase: "running", scanId: null, message: "Submitting scan…", progressFraction: 0 });
    setScanResult(null);
    setHistoryScanId(null);
    stopPolling();

    try {
      const res = await fetch("/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: business.name,
          keyword,
          centerLat,
          centerLng,
          gridSize: gridConfig.gridSize,
          shape: gridConfig.shape,
          spacingKm,
        }),
      });

      const data = (await res.json()) as ScanCreateResponse & { error?: string };
      if (!res.ok) {
        setScanStatus({ phase: "error", scanId: null, message: data.error ?? "Failed to create scan", progressFraction: 0 });
        return;
      }

      const { scanId, totalPoints, estimatedCostUsd } = data;
      setScanStatus({
        phase: "running", scanId,
        message: `Scan started — ${totalPoints} points, est. $${estimatedCostUsd.toFixed(4)} — scanning…`,
        progressFraction: 0,
      });

      void pollScan(scanId);
      pollTimerRef.current = setInterval(() => void pollScan(scanId), 3_000);
    } catch (err) {
      setScanStatus({ phase: "error", scanId: null, message: err instanceof Error ? err.message : "Network error", progressFraction: 0 });
    }
  }

  const isRunning = scanStatus.phase === "running";

  // Handle public /report/:token route
  const reportToken = window.location.pathname.match(/^\/report\/([a-f0-9]{32})$/)?.[1];
  if (reportToken) {
    return <ReportPage token={reportToken} />;
  }

  const breadcrumb = (
    <nav className="breadcrumb">
      <span>Rank Tracking</span>
      <span className="sep">›</span>
      <span className="current">{PAGE_TITLES[page]}</span>
    </nav>
  );

  return (
    <div className="app-shell">
      <Sidebar page={page} onNav={setPage} />
      <div className="main-content">
        <header className="page-header">{breadcrumb}</header>

        {page === "new-scan" && (
          <div className="card-stack">
            <BusinessSearchCard selected={business} onSelect={setBusiness} />

            {business && (
              <PreviousKeywordsBar
                business={business}
                activeScanId={historyScanId ?? scanResult?.id ?? null}
                onSelect={(scanId) => void loadHistoryScan(scanId)}
              />
            )}

            <KeywordInputCard
              businessName={business?.name ?? ""}
              keywords={keywords}
              onChange={setKeywords}
            />

            <GridConfigCard
              config={gridConfig}
              onChange={setGridConfig}
              onRun={() => void handleRun()}
              isRunning={isRunning}
              validationErrors={validationErrors}
            />

            {scanStatus.phase !== "idle" && <ScanStatusBar status={scanStatus} />}

            {scanResult && <ScanResultsMap result={scanResult} isLive={isRunning} />}

            {scanResult && !isRunning && scanStatus.phase === "complete" && (
              <>
                <CompetitorLeaderboard scanId={scanResult.id} trackedBusinessName={scanResult.business.name} />
                <div className="card" style={{ overflow: "hidden" }}>
                  <ExportBar scanId={scanResult.id} />
                </div>
              </>
            )}
          </div>
        )}

        {page === "history" && <HistoryPage />}
        {page === "schedules" && <SchedulesPage />}
      </div>
    </div>
  );
}

function ScanStatusBar({ status }: { status: ScanStatus }) {
  const icon = status.phase === "running" ? <span className="spinner" />
    : status.phase === "complete" ? "✓" : "✕";
  const color = status.phase === "complete" ? "var(--color-rank-good)"
    : status.phase === "error" ? "var(--color-rank-poor)" : "var(--color-navy)";

  return (
    <div className="scan-status-bar">
      <span className="status-icon" style={{ color }}>{icon}</span>
      <div className="status-info">
        <div className="status-title" style={{ color }}>
          {status.phase === "running" ? "Scan in progress"
            : status.phase === "complete" ? "Scan complete" : "Scan error"}
        </div>
        <div className="status-sub">{status.message}</div>
      </div>
      {status.phase === "running" && (
        <div style={{ width: 160 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${Math.round(status.progressFraction * 100)}%` }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right", marginTop: 3 }}>
            {Math.round(status.progressFraction * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
