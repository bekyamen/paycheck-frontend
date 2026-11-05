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

export default function RegisterScreen({ onSuccess, onGoLogin, showToast }: RegisterScreenProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [accountType, setAccountType] = useState("PERSONAL");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ""))) e.phone = "Enter a valid phone number";
    if (pin.length < 4) e.pin = "PIN must be 4 digits";
    if (pin !== confirmPin) e.confirmPin = "PINs do not match";
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
      const res = await register({ fullName: fullName.trim(), phone: phone.trim(), pinCode: pin, accountType });
      haptic("success");
      showToast("Account created! Welcome 🎉", "success");
      onSuccess(res.token, res.user);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Create Account</h1>
        <p className="text-muted text-sm" style={{ marginTop: "4px" }}>
          Set up your CF Verification account
        </p>
      </div>

      <div className="screen-content">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">Full Name</label>
            <input
              id="reg-fullname"
              className={`form-input ${errors.fullName ? "error" : ""}`}
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={loading}
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
              placeholder="+251912345678"
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
            <select
              id="reg-type"
              className="form-input form-select"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              disabled={loading}
            >
              <option value="PERSONAL">Individual / Personal</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>

          {/* PIN */}
          <PinInput
            label="Create PIN"
            value={pin}
            onChange={setPin}
            error={errors.pin}
            autoFocus
          />

          {/* Confirm PIN */}
          <PinInput
            label="Confirm PIN"
            value={confirmPin}
            onChange={setConfirmPin}
            error={errors.confirmPin}
          />

          <button
            id="reg-submit"
            type="submit"
            className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "" : "Create Account"}
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
