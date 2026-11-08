"use client";
import { useState } from "react";
import PinInput from "@/components/ui/PinInput";
import { login, cashierPasswordLogin } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface LoginScreenProps {
  onSuccess: (token: string, user: UserProfile, isCashier?: boolean) => void;
  onGoRegister: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function LoginScreen({
  onSuccess,
  onGoRegister,
  showToast,
}: LoginScreenProps) {
  const [mode, setMode] = useState<"admin" | "cashier">("admin");

  // Admin credentials
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  // Cashier credentials (password only)
  const [cashierPassword, setCashierPassword] = useState("");
  const [showOptionalName, setShowOptionalName] = useState(false);
  const [cashierFullName, setCashierFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateAdmin() {
    const e: Record<string, string> = {};
    if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ""))) {
      e.phone = "Enter a valid phone number (e.g. 0912345678)";
    }
    if (pin.length !== 4) {
      e.pin = "PIN must be exactly 4 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateCashier() {
    const e: Record<string, string> = {};
    if (!cashierPassword.trim()) {
      e.cashierPassword = "Password is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAdmin()) {
      haptic("error");
      return;
    }
    setLoading(true);
    try {
      const res = await login(phone.trim(), pin);
      haptic("success");
      showToast(res.message || "Welcome back!", "success");
      onSuccess(res.token, res.user, false);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Invalid phone or PIN", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCashierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCashier()) {
      haptic("error");
      return;
    }
    setLoading(true);
    try {
      const res = await cashierPasswordLogin({
        password: cashierPassword,
        fullName: cashierFullName.trim() || undefined,
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
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            {mode === "admin" ? "Business Admin Sign In" : "Cashier Sign In"}
          </h1>
          <p className="text-muted text-sm">
            {mode === "admin"
              ? "Sign in with your phone and 4-digit PIN"
              : "Enter your cashier password to check payments"}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div
          style={{
            display: "flex",
            background: "var(--tg-theme-secondary-bg-color, #2c2c2e)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            marginBottom: "24px",
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
            Admin Sign In
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
            Cashier Sign In
          </button>
        </div>

        {/* ── ADMIN LOGIN FORM ── */}
        {mode === "admin" ? (
          <form onSubmit={handleAdminSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-phone">Phone Number</label>
              <input
                id="login-phone"
                className={`form-input ${errors.phone ? "error" : ""}`}
                type="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={loading}
              />
              {errors.phone && <span className="text-danger text-sm">{errors.phone}</span>}
            </div>

            <PinInput
              label="4-Digit PIN"
              value={pin}
              onChange={setPin}
              error={errors.pin}
              autoFocus
            />

            <button
              id="login-submit"
              type="submit"
              className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
              disabled={loading}
              style={{ marginTop: "8px" }}
            >
              {loading ? "" : "Sign In as Admin"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onGoRegister}
              disabled={loading}
              style={{ textAlign: "center", marginTop: "4px" }}
            >
              {"Don't have an admin account? "}
              <span className="text-accent" style={{ fontWeight: 600 }}>Create One</span>
            </button>
          </form>
        ) : (
          /* ── CASHIER LOGIN FORM (PASSWORD ONLY) ── */
          <form onSubmit={handleCashierSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cashier-password">Cashier Password</label>
              <input
                id="cashier-password"
                className={`form-input ${errors.cashierPassword ? "error" : ""}`}
                type="password"
                placeholder="Enter your password"
                value={cashierPassword}
                onChange={(e) => setCashierPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                autoFocus
              />
              {errors.cashierPassword && <span className="text-danger text-sm">{errors.cashierPassword}</span>}
            </div>

            {/* Optional name disambiguation toggle */}
            {!showOptionalName ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowOptionalName(true)}
                style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #8e8e93)", padding: "4px" }}
              >
                + Optional: Specify your name if multiple cashiers share password
              </button>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="cashier-name">Your Name (Optional)</label>
                <input
                  id="cashier-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Almaz"
                  value={cashierFullName}
                  onChange={(e) => setCashierFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <button
              id="cashier-submit"
              type="submit"
              className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
              disabled={loading}
              style={{ marginTop: "8px" }}
            >
              {loading ? "" : "Sign In to Verify Payments"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
