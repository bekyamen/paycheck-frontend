"use client";
import { useState } from "react";
import PinInput from "@/components/ui/PinInput";
import { login } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface LoginScreenProps {
  onSuccess: (token: string, user: UserProfile) => void;
  onGoRegister: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function LoginScreen({ onSuccess, onGoRegister, showToast }: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ""))) e.phone = "Enter a valid phone number";
    if (pin.length < 4) e.pin = "PIN must be 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { haptic("error"); return; }
    setLoading(true);
    try {
      const res = await login(phone.trim(), pin);
      haptic("success");
      onSuccess(res.token, res.user);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Login failed. Check your phone and PIN.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "var(--spacing-lg)" }}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "22px",
              background: "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(10, 132, 255, 0.35)",
            }}
          >
            🏦
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "6px" }}>Welcome Back</h1>
          <p className="text-muted text-sm">Sign in to manage your accounts</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-phone">Phone Number</label>
            <input
              id="login-phone"
              className={`form-input ${errors.phone ? "error" : ""}`}
              type="tel"
              placeholder="+251912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={loading}
            />
            {errors.phone && <span className="text-danger text-sm">{errors.phone}</span>}
          </div>

          <PinInput
            label="PIN"
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
            {loading ? "" : "Sign In"}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onGoRegister}
            disabled={loading}
            style={{ textAlign: "center" }}
          >
            {"Don't have an account? "}
            <span className="text-accent">Register</span>
          </button>
        </form>
      </div>
    </div>
  );
}
