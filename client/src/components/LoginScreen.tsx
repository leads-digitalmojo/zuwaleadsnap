import { useState, type FC, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { isDigitalMojoEmail } from "../lib/supabase";
import {
  IconLock,
  IconAlertTriangle,
  IconCheck,
  IconGoogle,
  IconShield,
  IconArrowRight,
  IconSparkles,
  IconRefresh,
} from "./Icons";

type AuthTab = "direct-otp" | "password" | "signup";

export const LoginScreen: FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendDirectOtp,
    verifyDirectOtp,
    error: authError,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>("direct-otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [directOtp, setDirectOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"enter-email" | "enter-code">("enter-email");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeError = formError || authError;

  // Countdown timer for resend
  useState(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  });

  async function handleSendDirectOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    if (isLoading) return;
    setFormError(null);
    setSuccessMsg(null);

    const trimmed = email.trim();
    if (!isDigitalMojoEmail(trimmed)) {
      setFormError("Access restricted: You must use an official @digitalmojo.in email address.");
      return;
    }

    setIsLoading(true);
    try {
      await sendDirectOtp(trimmed);
      setOtpStep("enter-code");
      setSuccessMsg(`One-time login code sent to ${trimmed}`);
      setResendCooldown(30);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send login code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyDirectOtp(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const code = directOtp.trim().replace(/\s+/g, "");
    if (code.length < 6) {
      setFormError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      // Direct OTP sign in automatically marks 2FA as verified!
      await verifyDirectOtp(email.trim(), code);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
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
      if (tab === "password") {
        // Successful password login will trigger 2FA OTP prompt next
        await signInWithEmail(trimmed, password);
      } else {
        await signUpWithEmail(trimmed, password);
        setSuccessMsg("Account registered! Please check your @digitalmojo.in email for verification, or sign in.");
        setTab("password");
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
          maxWidth: 440,
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            background: "var(--ink)",
            color: "#ffffff",
            padding: "36px 32px 28px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Mojo "M" Brand Mark */}
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
            Mojo<span style={{ color: "var(--gold)" }}>Map</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: "#a4a2aa",
              fontFamily: "var(--font-sans)",
            }}
          >
            Google Business Profile Geo-Grid Intelligence
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              padding: "4px 12px",
              background: "rgba(240, 188, 0, 0.12)",
              border: "1px solid rgba(240, 188, 0, 0.3)",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              color: "#ffe95c",
            }}
          >
            <IconShield size={13} />
            <span>Digital Mojo Internal Portal</span>
          </div>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--hairline)",
            background: "var(--canvas)",
          }}
        >
          <button
            type="button"
            onClick={() => { setTab("direct-otp"); setFormError(null); setSuccessMsg(null); }}
            style={{
              flex: 1,
              padding: "13px 8px",
              border: "none",
              background: tab === "direct-otp" ? "var(--surface)" : "transparent",
              borderBottom: tab === "direct-otp" ? "2px solid var(--ink)" : "2px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: tab === "direct-otp" ? 700 : 500,
              color: tab === "direct-otp" ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => { setTab("password"); setFormError(null); setSuccessMsg(null); }}
            style={{
              flex: 1,
              padding: "13px 8px",
              border: "none",
              background: tab === "password" ? "var(--surface)" : "transparent",
              borderBottom: tab === "password" ? "2px solid var(--ink)" : "2px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: tab === "password" ? 700 : 500,
              color: tab === "password" ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setFormError(null); setSuccessMsg(null); }}
            style={{
              flex: 1,
              padding: "13px 8px",
              border: "none",
              background: tab === "signup" ? "var(--surface)" : "transparent",
              borderBottom: tab === "signup" ? "2px solid var(--ink)" : "2px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: tab === "signup" ? 700 : 500,
              color: tab === "signup" ? "var(--ink)" : "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          {/* Domain Notice Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              background: "var(--gold-tint)",
              border: "1px solid #ebd48f",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "#7a4b00",
              lineHeight: 1.45,
              marginBottom: 20,
            }}
          >
            <IconLock size={15} style={{ flexShrink: 0, marginTop: 2, color: "#925900" }} />
            <div>
              <strong>Domain Restricted:</strong> Only verified <code>@digitalmojo.in</code> Google Workspace accounts are permitted.
            </div>
          </div>

          {activeError && (
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
                marginBottom: 18,
                lineHeight: 1.4,
              }}
            >
              <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{activeError}</div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                background: "var(--rank-good-tint)",
                border: "1px solid #a3e6b5",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                color: "var(--rank-good)",
                marginBottom: 18,
                lineHeight: 1.4,
              }}
            >
              <IconCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{successMsg}</div>
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
              padding: "12px 18px",
              marginBottom: 20,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <IconGoogle size={17} />
            <span>Continue with Google (@digitalmojo.in)</span>
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
              color: "var(--ink-muted)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
            <span>{tab === "direct-otp" ? "or log in directly with OTP" : "or continue with credentials"}</span>
            <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          </div>

          {/* TAB 1: DIRECT EMAIL OTP */}
          {tab === "direct-otp" && (
            <div>
              {otpStep === "enter-email" ? (
                <form onSubmit={handleSendDirectOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="otp-email">
                      Work Email
                    </label>
                    <input
                      id="otp-email"
                      type="email"
                      required
                      className="text-input"
                      placeholder="name@digitalmojo.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="btn-run"
                    style={{
                      marginTop: 4,
                      padding: "13px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>{isLoading ? "Sending Code…" : "Send 6-Digit Login Code"}</span>
                    {!isLoading && <IconArrowRight size={15} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyDirectOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="direct-otp-code">
                      Enter 6-Digit Code sent to {email}
                    </label>
                    <input
                      id="direct-otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={8}
                      required
                      autoFocus
                      placeholder="123456"
                      value={directOtp}
                      onChange={(e) => setDirectOtp(e.target.value)}
                      style={{
                        width: "100%",
                        textAlign: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: "0.2em",
                        fontFamily: "var(--font-mono)",
                        padding: "10px 14px",
                        border: "2px solid var(--hairline)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface)",
                        color: "var(--ink)",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || directOtp.trim().length < 6}
                    className="btn-run"
                    style={{
                      padding: "13px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span>{isLoading ? "Verifying Code…" : "Sign In with Code"}</span>
                    {!isLoading && <IconArrowRight size={15} />}
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <button
                      type="button"
                      onClick={() => void handleSendDirectOtp()}
                      disabled={resendCooldown > 0 || isLoading}
                      style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <IconRefresh size={12} />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep("enter-email")}
                      style={{ background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer" }}
                    >
                      Change Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2 & 3: PASSWORD & SIGNUP */}
          {(tab === "password" || tab === "signup") && (
            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="work-email">
                  Work Email
                </label>
                <input
                  id="work-email"
                  type="email"
                  required
                  className="text-input"
                  placeholder="name@digitalmojo.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="work-password">
                  Password
                </label>
                <input
                  id="work-password"
                  type="password"
                  required
                  className="text-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === "password" ? "current-password" : "new-password"}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-run"
                style={{
                  marginTop: 6,
                  padding: "13px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{isLoading ? "Authenticating…" : tab === "password" ? "Sign In (2FA Required)" : "Register Mojo Account"}</span>
                {!isLoading && <IconArrowRight size={15} />}
              </button>
            </form>
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
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
            <span>Digital Mojo Internal Rank Tracker</span>
          </div>
        </div>
      </div>
    </div>
  );
};
