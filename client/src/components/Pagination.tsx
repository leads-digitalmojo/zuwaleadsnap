import { IconArrowLeft, IconArrowRight } from "./Icons";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  itemName?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  itemName = "items",
}: Props) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers array (with ellipsis if large)
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const pStart = Math.max(2, page - 1);
    const pEnd = Math.min(totalPages - 1, page + 1);
    for (let i = pStart; i <= pEnd; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "14px 20px",
        background: "var(--surface)",
        borderTop: "1px solid var(--hairline)",
        fontSize: 12.5,
        color: "var(--ink-muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span>
          Showing <strong style={{ color: "var(--ink)" }}>{start}–{end}</strong> of{" "}
          <strong style={{ color: "var(--ink)" }}>{total}</strong> {itemName}
        </span>

        {onLimitChange && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                padding: "3px 8px",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-hover)",
                fontSize: 12,
                color: "var(--ink)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <IconArrowLeft size={13} />
          <span>Prev</span>
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} style={{ padding: "0 4px", color: "var(--ink-faint)" }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: 28,
                height: 28,
                padding: "0 6px",
                borderRadius: "var(--radius-sm)",
                border: p === page ? "1px solid var(--ink)" : "1px solid var(--hairline)",
                background: p === page ? "var(--ink)" : "var(--surface)",
                color: p === page ? "var(--gold-bright)" : "var(--ink)",
                fontWeight: p === page ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span>Next</span>
          <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
