"use client";
import { useState } from "react";
import PinInput from "@/components/ui/PinInput";
import { register } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface RegisterScreenProps {
  onSuccess: (token: string, user: UserProfile) => void;
  onGoLogin: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const PHONE_REGEX = /^(?:\+251|0)?[97]\d{8}$/;

export default function RegisterScreen({ onSuccess, onGoLogin, showToast }: RegisterScreenProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [accountType, setAccountType] = useState<"BUSINESS" | "PERSONAL">("BUSINESS");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    const cleanPhone = phone.replace(/[\s\-()]/g, "");

    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = "Full name must be at least 2 characters";
    }
    if (!PHONE_REGEX.test(cleanPhone)) {
      e.phone = "Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678)";
    }
    if (!/^\d{4}$/.test(pin)) {
      e.pin = "PIN must be exactly 4 digits";
    }
    if (pin !== confirmPin) {
      e.confirmPin = "PINs do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      haptic("error");
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        fullName: fullName.trim(),
        phone: phone.replace(/[\s\-()]/g, ""),
        pinCode: pin,
        accountType,
      });
      haptic("success");
      showToast(res.message || "Account created successfully! Welcome 🎉", "success");
      onSuccess(res.token, res.user);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Registration failed. Please check your details.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Create Admin Account</h1>
        <p className="text-muted text-sm" style={{ marginTop: "4px" }}>
          Register your business and set up payment verification
        </p>
      </div>

      <div className="screen-content" style={{ maxWidth: "460px", margin: "0 auto", width: "100%" }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}
        >
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">Your Full Name</label>
            <input
              id="reg-fullname"
              className={`form-input ${errors.fullName ? "error" : ""}`}
              type="text"
              placeholder="e.g. Dawit Haile"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={loading}
              autoFocus
            />
            {errors.fullName && <span className="text-danger text-sm">{errors.fullName}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone Number</label>
            <input
              id="reg-phone"
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

          {/* Account Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-type">Account Type</label>
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setAccountType("BUSINESS")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  border: accountType === "BUSINESS" ? "2px solid var(--tg-theme-button-color, #0a84ff)" : "1px solid var(--glass-border)",
                  background: accountType === "BUSINESS" ? "rgba(10, 132, 255, 0.15)" : "var(--tg-theme-secondary-bg-color, #2c2c2e)",
                  color: accountType === "BUSINESS" ? "var(--tg-theme-button-color, #0a84ff)" : "var(--tg-theme-text-color)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🏢 Business
              </button>
              <button
                type="button"
                onClick={() => setAccountType("PERSONAL")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  border: accountType === "PERSONAL" ? "2px solid var(--tg-theme-button-color, #0a84ff)" : "1px solid var(--glass-border)",
                  background: accountType === "PERSONAL" ? "rgba(10, 132, 255, 0.15)" : "var(--tg-theme-secondary-bg-color, #2c2c2e)",
                  color: accountType === "PERSONAL" ? "var(--tg-theme-button-color, #0a84ff)" : "var(--tg-theme-text-color)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                👤 Personal
              </button>
            </div>
          </div>

          {/* 4-Digit PIN */}
          <PinInput
            label="Create 4-Digit PIN"
            value={pin}
            onChange={setPin}
            error={errors.pin}
          />

          {/* Confirm PIN */}
          <PinInput
            label="Confirm 4-Digit PIN"
            value={confirmPin}
            onChange={setConfirmPin}
            error={errors.confirmPin}
          />

          <button
            id="reg-submit"
            type="submit"
            className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
            disabled={loading}
            style={{ marginTop: "12px" }}
          >
            {loading ? "" : "Create Account & Get Started"}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onGoLogin}
            disabled={loading}
            style={{ textAlign: "center" }}
          >
            Already have an account? <span className="text-accent">Sign In</span>
          </button>
        </form>
      </div>
    </div>
  );
}
