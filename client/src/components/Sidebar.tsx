import type { AppPage } from "../types";

interface Props {
  page: AppPage;
  onNav: (p: AppPage) => void;
}

export function Sidebar({ page, onNav }: Props) {
  function Item({ id, label, icon }: { id: AppPage; label: string; icon: React.ReactNode }) {
    return (
      <button
        className={`sidebar-item${page === id ? " active" : ""}`}
        onClick={() => onNav(id)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span className="icon">{icon}</span>
        {label}
      </button>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Zuwa</h1>
        <span>Grid Rank Tracker</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Rank Tracking</div>
        <Item id="new-scan" label="New Scan" icon={
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 7l2-3 2 2 2-3v5H5v-1z" />
          </svg>
        } />
        <Item id="history" label="Scan History" icon={
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M3 4h10v1H3V4zm0 3h10v1H3V7zm0 3h7v1H3v-1z" />
          </svg>
        } />
        <Item id="schedules" label="Scheduled Scans" icon={
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm0 3v5l3 2-.5.87L7 11V5h1z" />
          </svg>
        } />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Reports</div>
        <div className="sidebar-item">
          <svg className="icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 12l3-3 3 3 4-6 2 2V14H2v-2z" />
          </svg>
          Rank Trends
          <span className="coming-soon">Soon</span>
        </div>
      </div>
    </aside>
  );
}
