import { useState, type FC, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import {
  IconUser,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconSparkles,
} from "./Icons";

export const OnboardingScreen: FC = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [team, setTeam] = useState("SEO & Organic Growth");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setError("Please enter your full name.");
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ fullName: trimmed, team });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--canvas)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--ink)",
            color: "#ffffff",
            padding: "36px 32px 28px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 16px",
              borderRadius: 14,
              background: "#19181c",
              border: "1px solid #2e2d35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
            }}
          >
            <svg viewBox="0 0 620 404" fill="none" style={{ width: 32, height: 32 }}>
              <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
              <path d="M190 100 L330 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
              <path d="M425 100 L520 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            Welcome to Mojo<span style={{ color: "var(--gold)" }}>Map</span>!
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#a4a2aa",
              fontFamily: "var(--font-sans)",
            }}
          >
            Let's quickly set up your team profile before jumping into the dashboard.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 32px 28px" }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                background: "#fdecec",
                border: "1px solid #f8b4b4",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                color: "var(--rank-poor)",
                marginBottom: 20,
                lineHeight: 1.4,
              }}
            >
              <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="field-label" htmlFor="user-full-name">
                Your Full Name
              </label>
              <input
                id="user-full-name"
                type="text"
                required
                autoFocus
                className="text-input"
                placeholder="e.g. Nikhil or Pavan Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ fontSize: 14, padding: "10px 14px" }}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="user-team">
                Department / Team
              </label>
              <select
                id="user-team"
                className="select-input"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                style={{ fontSize: 13.5, padding: "10px 14px", width: "100%" }}
              >
                <option value="SEO & Organic Growth">SEO & Organic Growth</option>
                <option value="Paid Performance & Media">Paid Performance & Media</option>
                <option value="Client Strategy & Accounts">Client Strategy & Accounts</option>
                <option value="Content & Creative">Content & Creative</option>
                <option value="Engineering & AI Ops">Engineering & AI Ops</option>
                <option value="Leadership & Management">Leadership & Management</option>
              </select>
            </div>

            <div>
              <label className="field-label">
                Verified Organization Email
              </label>
              <input
                type="text"
                disabled
                className="text-input"
                value={user?.email || ""}
                style={{
                  background: "var(--surface-hover)",
                  color: "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  cursor: "not-allowed",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !fullName.trim()}
              className="btn-run"
              style={{
                marginTop: 8,
                padding: "13px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>{isLoading ? "Saving Profile…" : "Access MojoMap Dashboard"}</span>
              {!isLoading && <IconArrowRight size={15} />}
            </button>
          </form>

          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid var(--hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 11.5,
              color: "var(--ink-muted)",
            }}
          >
            <IconSparkles size={13} style={{ color: "var(--gold)" }} />
            <span>Digital Mojo Workspace &bull; Instant One-Time Setup</span>
          </div>
        </div>
      </div>
    </div>
  );
};
