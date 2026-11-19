import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { IconAlertTriangle, IconPlus, IconClock, IconCalendar } from "../components/Icons";
import type { Schedule, GridSize, GridShape } from "../types";

interface SchedulesResponse {
  schedules: Schedule[];
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fromNow(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

interface CreateForm {
  name: string;
  businessName: string;
  keyword: string;
  centerLat: string;
  centerLng: string;
  gridSize: GridSize;
  shape: GridShape;
  spacingKm: string;
  recurrence: "weekly" | "monthly";
}

const EMPTY_FORM: CreateForm = {
  name: "",
  businessName: "",
  keyword: "",
  centerLat: "",
  centerLng: "",
  gridSize: 7,
  shape: "square",
  spacingKm: "1",
  recurrence: "weekly",
};

export function SchedulesPage() {
  const { authFetch } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch("/api/schedules");
      const data = (await res.json()) as SchedulesResponse;
      setSchedules(data.schedules ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const lat = parseFloat(form.centerLat);
    const lng = parseFloat(form.centerLng);
    const spacing = parseFloat(form.spacingKm);

    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.businessName.trim()) { setFormError("Business name is required"); return; }
    if (!form.keyword.trim()) { setFormError("Keyword is required"); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setFormError("Valid center latitude required"); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setFormError("Valid center longitude required"); return; }
    if (isNaN(spacing) || spacing <= 0) { setFormError("Spacing must be positive"); return; }

    setIsSaving(true);
    try {
      const res = await authFetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          businessName: form.businessName.trim(),
          keyword: form.keyword.trim(),
          centerLat: lat,
          centerLng: lng,
          gridSize: form.gridSize,
          shape: form.shape,
          spacingKm: spacing,
          recurrence: form.recurrence,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setFormError(err.error ?? "Failed to create schedule");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(id: number) {
    await authFetch(`/api/schedules/${id}/toggle`, { method: "PATCH" });
    await load();
  }

  async function deleteSchedule(id: number) {
    if (!confirm("Delete this schedule?")) return;
    await authFetch(`/api/schedules/${id}`, { method: "DELETE" });
    setSchedules((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="card-stack">
      <div className="card">
        <div className="card-header">
          <h2>Scheduled Scans</h2>
          <button className="btn-secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Schedule"}
          </button>
        </div>

        {showForm && (
          <div style={{ padding: "20px", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <form onSubmit={(e) => void handleCreate(e)}>
              <div className="grid-config-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
                <div className="field-group">
                  <label className="field-label">Schedule Name</label>
                  <input className="text-input" type="text" placeholder="Weekly Austin scan" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Business Name</label>
                  <input className="text-input" type="text" placeholder="Radiant Plumbing…" value={form.businessName} onChange={(e) => setField("businessName", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Keyword</label>
                  <input className="text-input" type="text" placeholder="plumber near me" value={form.keyword} onChange={(e) => setField("keyword", e.target.value)} />
                </div>
              </div>
              <div className="grid-config-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", marginBottom: 12 }}>
                <div className="field-group">
                  <label className="field-label">Center Lat</label>
                  <input className="text-input" type="text" inputMode="decimal" placeholder="30.2672" value={form.centerLat} onChange={(e) => setField("centerLat", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Center Lng</label>
                  <input className="text-input" type="text" inputMode="decimal" placeholder="-97.7431" value={form.centerLng} onChange={(e) => setField("centerLng", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Grid Size</label>
                  <select className="select-input" value={form.gridSize} onChange={(e) => setField("gridSize", parseInt(e.target.value) as GridSize)}>
                    <option value={5}>5×5</option>
                    <option value={7}>7×7</option>
                    <option value={13}>13×13</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Spacing (km)</label>
                  <input className="text-input" type="text" inputMode="decimal" placeholder="1" value={form.spacingKm} onChange={(e) => setField("spacingKm", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Recurrence</label>
                  <select className="select-input" value={form.recurrence} onChange={(e) => setField("recurrence", e.target.value as "weekly" | "monthly")}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              {formError && (
                <div className="validation-error" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}
              <button className="btn-secondary" type="submit" disabled={isSaving}>
                {isSaving ? "Creating…" : "Create Schedule"}
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center" }}><span className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            No scheduled scans yet. Create one to run automatically on a cadence.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Name", "Business", "Keyword", "Cadence", "Next run", "Last run", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", borderBottom: "2px solid var(--color-border)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)", opacity: s.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-muted)" }}>{s.businessName}</td>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-muted)" }}>{s.keyword}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 100, background: "var(--color-surface)", border: "1px solid var(--color-border)", fontWeight: 600 }}>
                      {s.recurrence}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--color-text-muted)" }}>{fromNow(s.nextRunAt)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--color-text-muted)" }}>{s.lastRunAt ? ago(s.lastRunAt) : "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.isActive ? "var(--color-rank-good)" : "var(--color-text-muted)" }}>
                      {s.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void toggle(s.id)}>
                        {s.isActive ? "Pause" : "Resume"}
                      </button>
                      <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 8px", color: "var(--color-rank-poor)" }} onClick={() => void deleteSchedule(s.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
