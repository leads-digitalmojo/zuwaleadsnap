import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isDigitalMojoEmail } from "../lib/supabase";
import { IconLock } from "./Icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: Props) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const trimmed = email.trim();
    if (!isDigitalMojoEmail(trimmed)) {
      setFormError("Access restricted: You must use an official @digitalmojo.in email address.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (tab === "signin") {
        await signInWithEmail(trimmed, password);
        onClose();
      } else {
        await signUpWithEmail(trimmed, password);
        setSuccessMsg("Account created! Please check your @digitalmojo.in inbox to verify your email, or sign in now.");
        setTab("signin");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogle() {
    setIsLoading(true);
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google Sign-In failed.");
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 16, 19, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
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
            color: "#fff",
            padding: "24px 28px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              background: "none",
              border: "none",
              color: "#a4a2aa",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>

          <div
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 12px",
              borderRadius: 12,
              background: "#19181c",
              border: "1px solid #2c2b32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            <svg viewBox="0 0 620 404" fill="none" style={{ width: 26, height: 26 }}>
              <ellipse cx="97" cy="300" rx="97" ry="92" fill="#FFE95C" />
              <path d="M190 100 L330 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
              <path d="M425 100 L520 300" stroke="#FFE95C" strokeWidth="110" strokeLinecap="round" />
            </svg>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>
            Mojo<span>Map</span> Authentication
          </h2>
          <div style={{ fontSize: 12, color: "#a4a2aa" }}>
            Restricted to Digital Mojo organization members
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--hairline)", background: "var(--surface-hover)" }}>
          <button
            type="button"
            onClick={() => { setTab("signin"); setFormError(null); }}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "none",
              background: tab === "signin" ? "var(--surface)" : "transparent",
              borderBottom: tab === "signin" ? "2px solid var(--ink)" : "2px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: tab === "signin" ? 700 : 500,
              color: tab === "signin" ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setFormError(null); }}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "none",
              background: tab === "signup" ? "var(--surface)" : "transparent",
              borderBottom: tab === "signup" ? "2px solid var(--ink)" : "2px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: tab === "signup" ? 700 : 500,
              color: tab === "signup" ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: "24px 28px" }}>
          {/* Domain Notice Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "var(--gold-tint)",
              border: "1px solid #ebd48f",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "#7a4b00",
              marginBottom: 18,
            }}
          >
            <IconLock size={15} style={{ color: "#925900" }} />
            <span>Only <strong>@digitalmojo.in</strong> email accounts are permitted.</span>
          </div>

          {formError && (
            <div
              style={{
                padding: "10px 12px",
                background: "#fdecec",
                border: "1px solid #f8b4b4",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                color: "var(--rank-poor)",
                marginBottom: 16,
              }}
            >
              ⚠ {formError}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "10px 12px",
                background: "var(--rank-good-tint)",
                border: "1px solid #a3e6b5",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                color: "var(--rank-good)",
                marginBottom: 16,
              }}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              marginBottom: 18,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google (@digitalmojo.in)
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
              color: "var(--ink-muted)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
            <span>or use email</span>
            <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="field-label">Work Email</label>
              <input
                type="email"
                required
                className="text-input"
                placeholder="name@digitalmojo.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                required
                className="text-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-run"
              style={{ marginTop: 8 }}
            >
              {isLoading ? "Authenticating…" : tab === "signin" ? "Sign In to MojoMap" : "Register Mojo Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
