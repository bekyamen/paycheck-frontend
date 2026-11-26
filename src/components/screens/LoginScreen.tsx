"use client";
import { useState } from "react";
import { cashierPasswordLogin, telegramPhoneLogin } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface LoginScreenProps {
  onSuccess: (token: string, user: UserProfile, isCashier?: boolean) => void;
  onGoRegister: (prefilledPhone?: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function LoginScreen({
  onSuccess,
  onGoRegister,
  showToast,
}: LoginScreenProps) {
  const [mode, setMode] = useState<"admin" | "cashier">("admin");

  // Cashier credentials (password only)
  const [cashierPassword, setCashierPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [unregisteredPhone, setUnregisteredPhone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateCashier() {
    const e: Record<string, string> = {};
    if (!cashierPassword.trim()) {
      e.cashierPassword = "Password is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleTelegramSignIn() {
    // Clear manual sign-out flag since the user explicitly tapped Sign In
    if (typeof window !== "undefined") {
      localStorage.removeItem("manual_logout");
      localStorage.removeItem("cf_logged_out");
    }

    setUnregisteredPhone(null);
    setErrors({});

    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

    setTgLoading(true);
    haptic("selection");

    try {
      const initData = tg?.initData || "";
      const res = await telegramPhoneLogin({
        initData,
      });

      haptic("success");
      showToast(res.message || "Signed in successfully!", "success");
      onSuccess(res.token, res.user, res.user.role === "CASHIER");
    } catch (err: any) {
      haptic("error");
      const errorMsg = err.message || "";
      if (
        err.statusCode === 404 ||
        err.verificationResult?.notFound ||
        errorMsg.toLowerCase().includes("not found")
      ) {
        setUnregisteredPhone("unregistered");
        showToast("Account not found. Please register first.", "error");
      } else {
        showToast(errorMsg || "Telegram sign-in failed. Please try again.", "error");
      }
    } finally {
      setTgLoading(false);
    }
  }

  async function handleCashierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCashier()) {
      haptic("error");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("manual_logout");
      localStorage.removeItem("cf_logged_out");
    }
    setLoading(true);
    try {
      const res = await cashierPasswordLogin({
        password: cashierPassword,
      });
      haptic("success");
      showToast(`Welcome, ${res.cashier.fullName}!`, "success");
      onSuccess(res.token, res.cashier, true);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Wrong password, try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "var(--spacing-lg)",
          maxWidth: "460px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 14px",
              boxShadow: "0 8px 32px rgba(10, 132, 255, 0.35)",
            }}
          >
            {mode === "admin" ? "🏦" : "⚡"}
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>
            Sign In
          </h1>
          <p className="text-muted text-sm">
            {mode === "admin"
              ? "Passwordless authentication via Telegram"
              : "Sign in with your branch cashier password"}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div
          style={{
            display: "flex",
            background: "var(--tg-theme-secondary-bg-color, #2c2c2e)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setMode("admin");
              setErrors({});
            }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              background: mode === "admin" ? "var(--tg-theme-button-color, #0a84ff)" : "transparent",
              color: mode === "admin" ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
              transition: "all 0.2s ease",
            }}
          >
            Admin (Owner)
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setMode("cashier");
              setErrors({});
            }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              background: mode === "cashier" ? "var(--tg-theme-button-color, #0a84ff)" : "transparent",
              color: mode === "cashier" ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
              transition: "all 0.2s ease",
            }}
          >
            Cashier (Staff)
          </button>
        </div>

        {/* ── ADMIN / OWNER PASSWORDLESS TELEGRAM SIGN IN ── */}
        {mode === "admin" ? (
          <div
            style={{
              background: "var(--tg-theme-secondary-bg-color, #1c1c1e)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 18px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "var(--tg-theme-hint-color, #8e8e93)",
                marginBottom: "20px",
                lineHeight: "1.4",
              }}
            >
              Administrators sign in instantly using their Telegram-verified phone number. No passwords or PINs required.
            </p>

            <button
              id="btn-tg-phone-login"
              type="button"
              className="btn btn-primary"
              onClick={handleTelegramSignIn}
              disabled={tgLoading}
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0088cc 0%, #00a2ff 100%)",
                boxShadow: "0 4px 16px rgba(0, 136, 204, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {tgLoading ? (
                <>
                  <span
                    className="spinner-sm"
                    style={{
                      display: "inline-block",
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "18px" }}>✈️</span>
                  <span>Sign In with Telegram</span>
                </>
              )}
            </button>

            {/* Unregistered phone alert */}
            {unregisteredPhone && (
              <div
                style={{
                  marginTop: "16px",
                  borderRadius: "12px",
                  padding: "14px",
                  border: "1px solid var(--tg-theme-button-color, #0a84ff)",
                  background: "rgba(10, 132, 255, 0.08)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--tg-theme-text-color, #ffffff)",
                    marginBottom: "8px",
                  }}
                >
                  Account not found. Please register first.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onGoRegister()}
                  style={{ width: "100%", fontSize: "13px" }}
                >
                  Create an Account
                </button>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--tg-theme-hint-color, #8e8e93)" }}>
              New business owner?{" "}
              <button
                type="button"
                onClick={() => onGoRegister()}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--tg-theme-button-color, #0088cc)",
                  textDecoration: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create account
              </button>
            </div>
          </div>
        ) : (
          /* ── CASHIER LOGIN FORM (PASSWORD ONLY) ── */
          <form
            onSubmit={handleCashierSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}
          >
            <div
              style={{
                background: "rgba(48, 209, 88, 0.1)",
                border: "1px solid rgba(48, 209, 88, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                marginBottom: "4px",
              }}
            >
              <p style={{ fontSize: "13px", color: "#30d158", margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                ⚡ Staff members enter only their branch password provided by the business admin.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cashier-password">
                Cashier Password
              </label>
              <input
                id="cashier-password"
                className={`form-input ${errors.cashierPassword ? "error" : ""}`}
                type="password"
                placeholder="Enter branch cashier password"
                value={cashierPassword}
                onChange={(e) => setCashierPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                autoFocus
              />
              {errors.cashierPassword && (
                <span className="text-danger text-sm">{errors.cashierPassword}</span>
              )}
            </div>

            <button
              id="cashier-login-submit"
              type="submit"
              className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
              disabled={loading}
              style={{
                marginTop: "8px",
                background: "#30d158",
                color: "#000000",
                fontWeight: 700,
                border: "none",
              }}
            >
              {loading ? "" : "Sign In as Cashier"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
