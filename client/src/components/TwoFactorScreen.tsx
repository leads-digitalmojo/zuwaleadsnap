import { useState, useEffect, useRef, type FC, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import {
  IconShield,
  IconLock,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconArrowRight,
  IconLogOut,
} from "./Icons";

export const TwoFactorScreen: FC = () => {
  const { user, send2faOtp, verify2faOtp, signOut } = useAuth();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);

  const hasDispatchedInitialOtp = useRef(false);

  // Send initial 2FA OTP on mount (guarded against React StrictMode double-mounting)
  useEffect(() => {
    if (hasDispatchedInitialOtp.current) return;
    hasDispatchedInitialOtp.current = true;

    let isMounted = true;
    send2faOtp()
      .then(() => {
        if (isMounted) setSuccessMsg(`Verification code dispatched to ${user?.email}`);
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message || "Failed to dispatch verification code.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const code = otp.trim().replace(/\s+/g, "");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      await verify2faOtp(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again or request a new code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await send2faOtp();
      setSuccessMsg(`New 6-digit code sent to ${user?.email}`);
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
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
          maxWidth: 440,
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
            <IconShield size={28} style={{ color: "var(--gold)" }} />
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
            Two-Factor Verification
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: "#a4a2aa",
              fontFamily: "var(--font-sans)",
            }}
          >
            Digital Mojo Security Protocol
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 32px 28px" }}>
          <div
            style={{
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              A 6-digit authentication code was sent to your official organization inbox:
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
                background: "var(--surface-hover)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                display: "inline-block",
                marginTop: 8,
                border: "1px solid var(--hairline)",
              }}
            >
              {user?.email}
            </div>
          </div>

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
                marginBottom: 18,
                lineHeight: 1.4,
              }}
            >
              <IconAlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
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

          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="field-label" htmlFor="otp-input" style={{ textAlign: "center", display: "block" }}>
                Enter 6-Digit Security Code
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                required
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "0.25em",
                  fontFamily: "var(--font-mono)",
                  padding: "12px 16px",
                  border: "2px solid var(--hairline)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ink)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.trim().length < 6}
              className="btn-run"
              style={{
                padding: "13px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>{isLoading ? "Verifying Code…" : "Verify & Access MojoMap"}</span>
              {!isLoading && <IconArrowRight size={15} />}
            </button>
          </form>

          {/* Resend & Sign out actions */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendCooldown > 0 || isLoading}
              style={{
                background: "none",
                border: "none",
                color: resendCooldown > 0 ? "var(--ink-faint)" : "var(--ink)",
                fontWeight: 600,
                cursor: resendCooldown > 0 ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <IconRefresh size={13} />
              <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              style={{
                background: "none",
                border: "none",
                color: "var(--rank-poor)",
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <IconLogOut size={13} />
              <span>Switch User</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
