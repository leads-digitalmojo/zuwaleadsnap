import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { IconShare, IconCheck, IconDownload } from "./Icons";

interface Props {
  scanId: number;
}

export function ExportBar({ scanId }: Props) {
  const { authFetch } = useAuth();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  async function generateShare() {
    setIsSharing(true);
    try {
      const res = await authFetch(`/scan/${scanId}/share`, { method: "POST" });
      const data = (await res.json()) as { url: string; token: string };
      const full = `${window.location.origin}${data.url}`;
      setShareUrl(full);
      await navigator.clipboard.writeText(full);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } finally {
      setIsSharing(false);
    }
  }

  async function downloadCsv() {
    try {
      const res = await authFetch(`/scan/${scanId}/export/csv`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mojomap_scan_${scanId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  async function downloadPdf() {
    setIsPdfLoading(true);
    try {
      const res = await authFetch(`/scan/${scanId}/export/pdf`);
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "PDF generation failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mojomap_scan_${scanId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "12px 20px", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>Export:</span>

      <button
        className="btn-secondary"
        style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => void generateShare()}
        disabled={isSharing}
      >
        {isSharing ? (
          <>
            <span className="spinner spinner-sm" />
            <span>Generating…</span>
          </>
        ) : isCopied ? (
          <>
            <IconCheck size={14} style={{ color: "var(--rank-good)" }} />
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <IconShare size={14} />
            <span>Share Report Link</span>
          </>
        )}
      </button>

      {shareUrl && !isCopied && (
        <input
          readOnly
          value={shareUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          style={{ fontSize: 11, padding: "5px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", width: 280, maxWidth: "100%", background: "var(--color-bg)" }}
        />
      )}

      <button
        className="btn-secondary"
        style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => void downloadCsv()}
      >
        <IconDownload size={14} />
        <span>CSV</span>
      </button>

      <button
        className="btn-secondary"
        style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => void downloadPdf()}
        disabled={isPdfLoading}
      >
        {isPdfLoading ? (
          <>
            <span className="spinner spinner-sm" />
            <span>Generating PDF…</span>
          </>
        ) : (
          <>
            <IconDownload size={14} />
            <span>PDF</span>
          </>
        )}
      </button>
    </div>
  );
}
