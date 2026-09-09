import { useState } from "react";

interface Props {
  scanId: number;
}

export function ExportBar({ scanId }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  async function generateShare() {
    setIsSharing(true);
    try {
      const res = await fetch(`/scan/${scanId}/share`, { method: "POST" });
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

  function downloadCsv() {
    window.location.href = `/scan/${scanId}/export/csv`;
  }

  async function downloadPdf() {
    setIsPdfLoading(true);
    try {
      const res = await fetch(`/scan/${scanId}/export/pdf`);
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "PDF generation failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zuwa_scan_${scanId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500 }}>Export:</span>

      <button className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => void generateShare()} disabled={isSharing}>
        {isSharing ? "Generating…" : isCopied ? "✓ Copied!" : "🔗 Share Link"}
      </button>

      {shareUrl && !isCopied && (
        <input
          readOnly
          value={shareUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--color-border)", borderRadius: 4, width: 300, background: "var(--color-bg)" }}
        />
      )}

      <button className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={downloadCsv}>
        ↓ CSV
      </button>

      <button className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => void downloadPdf()} disabled={isPdfLoading}>
        {isPdfLoading ? "Generating PDF…" : "↓ PDF"}
      </button>
    </div>
  );
}
