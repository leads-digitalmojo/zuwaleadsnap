import { useState, useEffect, useCallback, type FC } from "react";
import { ScanResultsMap } from "../components/ScanResultsMap";
import { CompetitorLeaderboard } from "../components/CompetitorLeaderboard";
import { ExportBar } from "../components/ExportBar";
import {
  IconArrowLeft,
  IconRefresh,
  IconMapPin,
  IconCalendar,
  IconClock,
  IconAlertTriangle,
} from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import type { ScanResponse } from "../types";

interface Props {
  scanId: number;
  onBack: () => void;
}

function statusBadge(s: string) {
  const color = s === "complete" ? "var(--rank-good)" : s === "error" ? "var(--rank-poor)" : "var(--gold-deep)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: s === "complete" ? "var(--rank-good-tint)" : s === "error" ? "var(--rank-poor-tint)" : "var(--gold-tint)",
        color,
      }}
    >
      {s}
    </span>
  );
}

export const ScanDetailPage: FC<Props> = ({ scanId, onBack }) => {
  const { authFetch } = useAuth();
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/scan/${scanId}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Failed to load scan #${scanId}`);
      }
      const data = (await res.json()) as ScanResponse;
      setScan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [scanId, authFetch]);

  useEffect(() => {
    void loadScan();
  }, [loadScan]);

  if (isLoading) {
    return (
      <div className="card-stack">
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ width: "fit-content", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <IconArrowLeft size={14} />
          <span>Back to Scan History</span>
        </button>

        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 500 }}>
            Loading scan #{scanId} data & map points…
          </div>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="card-stack">
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ width: "fit-content", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <IconArrowLeft size={14} />
          <span>Back to Scan History</span>
        </button>

        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ display: "inline-flex", color: "var(--rank-poor)", marginBottom: 12 }}>
            <IconAlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>Unable to View Scan</h3>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: 440, margin: "0 auto 16px" }}>
            {error || "Scan not found or access denied."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button className="btn-secondary" onClick={() => void loadScan()}>
              <IconRefresh size={14} /> Retry
            </button>
            <button className="btn-primary" onClick={onBack}>
              Return to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dateFormatted = new Date(scan.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card-stack">
      {/* Navigation Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 14px" }}
        >
          <IconArrowLeft size={14} />
          <span>Back to Scan History</span>
        </button>

        <button
          onClick={() => void loadScan()}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "8px 12px" }}
          title="Refresh scan data"
        >
          <IconRefresh size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Scan Detail Summary Card */}
      <div className="card">
        <div className="card-header" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, color: "var(--ink)", margin: 0 }}>
                {scan.business?.name || "Target Business"}
              </h2>
              {statusBadge(scan.status)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--ink-muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconMapPin size={13} style={{ color: "var(--gold-deep)" }} />
                <span>Keyword: <strong style={{ color: "var(--ink)" }}>"{scan.keyword}"</strong></span>
              </span>

              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconCalendar size={13} />
                <span>{dateFormatted}</span>
              </span>

              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconClock size={13} />
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {scan.gridConfig.gridSize}×{scan.gridConfig.gridSize} ({scan.gridConfig.shape}) · {scan.gridConfig.spacingKm}km spacing
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map & Competitor Breakdown */}
      <ScanResultsMap result={scan} />

      <CompetitorLeaderboard scanId={scan.id} trackedBusinessName={scan.business?.name || ""} />

      <div className="card" style={{ overflow: "hidden" }}>
        <ExportBar scanId={scan.id} />
      </div>
    </div>
  );
};
