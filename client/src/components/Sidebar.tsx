import type { AppPage } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  IconLayers,
  IconClock,
  IconCalendar,
  IconCompass,
  IconLogOut,
  IconX,
  IconShield,
} from "./Icons";

interface Props {
  page: AppPage;
  onNav: (p: AppPage) => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ page, onNav, onCloseMobile }: Props) {
  const { user, role, signOut } = useAuth();

  function handleNavigate(id: AppPage) {
    onNav(id);
    if (onCloseMobile) onCloseMobile();
  }

  function Item({ id, label, icon }: { id: AppPage; label: string; icon: React.ReactNode }) {
    return (
      <button
        className={`sidebar-item${page === id ? " active" : ""}`}
        onClick={() => handleNavigate(id)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span className="icon">{icon}</span>
        <span>{label}</span>
      </button>
    );
  }

  const displayName = (user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"] || user?.email?.split("@")[0] || "Member").trim();
  const initial = displayName ? displayName[0].toUpperCase() : "M";

  return (
    <aside className="sidebar">
      {/* Top Header with Brand & Optional Mobile Close */}
      <div className="sidebar-logo">
        <div className="sidebar-mark-container">
          {/* Official Digital Mojo 'M' Brand Mark */}
          <svg className="sidebar-mark-svg" viewBox="0 0 620 404" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
            <path d="M190 100 L330 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
            <path d="M425 100 L520 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <h1>Mojo<span>Map</span></h1>
          <span className="subtext">GBP Geo-Grid Intelligence</span>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="sidebar-mobile-close"
            aria-label="Close Menu"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Rank Tracking</div>
        <Item id="new-scan" label="New Scan" icon={<IconLayers size={17} />} />
        <Item id="history" label="Scan History" icon={<IconClock size={17} />} />
        <Item id="schedules" label="Scheduled Scans" icon={<IconCalendar size={17} />} />
      </div>

      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Reporting & Intelligence</div>
        <div className="sidebar-item" style={{ opacity: 0.65, cursor: "default" }}>
          <span className="icon"><IconCompass size={17} /></span>
          <span>Multi-Location Rollup</span>
          <span className="coming-soon">Soon</span>
        </div>
      </div>

      {/* User profile card */}
      {user && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #232227",
            background: "#161519",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: role === "admin" ? "var(--gold)" : "#2c2b32",
                color: role === "admin" ? "#111013" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={displayName}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#a4a2aa",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={user.email}
              >
                {user.email}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                <IconShield size={11} style={{ color: role === "admin" ? "var(--gold)" : "#a4a2aa" }} />
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: role === "admin" ? "rgba(240, 188, 0, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: role === "admin" ? "var(--gold)" : "#a4a2aa",
                    border: role === "admin" ? "1px solid rgba(240, 188, 0, 0.4)" : "1px solid #333",
                  }}
                >
                  {role === "admin" ? "Admin" : "Team Member"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => void signOut()}
            style={{
              width: "100%",
              padding: "7px 10px",
              background: "none",
              border: "1px solid #2c2b32",
              borderRadius: "var(--radius-sm)",
              color: "#a4a2aa",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "#444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#a4a2aa";
              e.currentTarget.style.borderColor = "#2c2b32";
            }}
          >
            <IconLogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
