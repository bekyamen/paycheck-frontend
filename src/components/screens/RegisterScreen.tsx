"use client";
import { useState, useEffect } from "react";
import { register } from "@/lib/api";
import { haptic, getInitData } from "@/lib/telegram";
import type { UserProfile } from "@/lib/api";

interface RegisterScreenProps {
  initialPhone?: string;
  onSuccess: (token: string, user: UserProfile) => void;
  onGoLogin: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const PHONE_REGEX = /^(?:\+251|0)?[97]\d{8}$/;

export default function RegisterScreen({
  initialPhone,
  onSuccess,
  onGoLogin,
  showToast,
}: RegisterScreenProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(initialPhone || "");
  const [accountType, setAccountType] = useState<"business" | "personal">("business");
  const [businessName, setBusinessName] = useState("");
  const [branchCount, setBranchCount] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Pre-fill phone from props or sessionStorage
  useEffect(() => {
    let phoneToUse = initialPhone || "";
    if (!phoneToUse && typeof window !== "undefined") {
      phoneToUse = sessionStorage.getItem("prefill_phone") || "";
    }
    if (phoneToUse) {
      setPhone(phoneToUse);
    }

    // Also pre-fill name from Telegram WebApp user if available
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      const tgName = [u.first_name, u.last_name].filter(Boolean).join(" ");
      if (tgName) setFullName(tgName);
    }
  }, [initialPhone]);

  // Validation errors
  const errors: Record<string, string> = {};
  const trimmedName = fullName.trim();
  const cleanedPhone = phone.trim().replace(/[\s\-()]/g, "");

  if (touched.fullName || trimmedName.length > 0) {
    if (trimmedName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    } else if (trimmedName.length > 60) {
      errors.fullName = "Full name must not exceed 60 characters";
    }
  }

  if (touched.phone || cleanedPhone.length > 0) {
    if (!cleanedPhone) {
      errors.phone = "Phone number is required";
    } else if (!PHONE_REGEX.test(cleanedPhone)) {
      errors.phone = "Please enter a valid Ethiopian phone number (e.g. 0912345678 or +2519...)";
    }
  }

  if (accountType === "business") {
    const trimmedBiz = businessName.trim();
    if (touched.businessName || trimmedBiz.length > 0) {
      if (trimmedBiz.length < 2) {
        errors.businessName = "Business name must be at least 2 characters";
      } else if (trimmedBiz.length > 80) {
        errors.businessName = "Business name cannot exceed 80 characters";
      }
    }
    if (touched.branchCount) {
      if (isNaN(branchCount) || branchCount < 1) {
        errors.branchCount = "Number of branches must be at least 1";
      } else if (branchCount > 500) {
        errors.branchCount = "Number of branches cannot exceed 500";
      }
    }
  }

  // Is form valid for enabling submission button
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 60;
  const isPhoneValid = PHONE_REGEX.test(cleanedPhone);
  const isBusinessValid =
    accountType === "personal" ||
    (businessName.trim().length >= 2 &&
      businessName.trim().length <= 80 &&
      branchCount >= 1 &&
      branchCount <= 500);

  const canSubmit = isNameValid && isPhoneValid && isBusinessValid && !loading;

  function handleAccountTypeChange(type: "business" | "personal") {
    haptic("selection");
    setAccountType(type);
    if (type === "personal") {
      setBusinessName("");
      setBranchCount(1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      fullName: true,
      phone: true,
      businessName: true,
      branchCount: true,
    });

    if (!canSubmit) {
      haptic("error");
      return;
    }

    setLoading(true);
    haptic("selection");

    try {
      const initData = getInitData();
      const res = await register({
        initData,
        fullName: trimmedName,
        phone: cleanedPhone,
        accountType,
        businessName: accountType === "business" ? businessName.trim() : undefined,
        branchCount: accountType === "business" ? Number(branchCount) : undefined,
      });

      // Clear sign-out flags on successful registration
      if (typeof window !== "undefined") {
        localStorage.removeItem("manual_logout");
        localStorage.removeItem("cf_logged_out");
        localStorage.setItem("cf_token", res.token);
      }

      haptic("success");
      showToast(res.message || "Account created successfully! Welcome 🎉", "success");
      onSuccess(res.token, res.user);
    } catch (err: any) {
      haptic("error");
      const msg = err.message || "Registration failed. Please check your details.";
      if (msg.includes("already exists") || msg.includes("already registered")) {
        showToast("Account already exists. Please sign in.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header" style={{ textAlign: "center", padding: "28px 16px 20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "8px" }}>✨</div>
        <h1 className="screen-title" style={{ fontSize: "24px", fontWeight: 800 }}>Create Account</h1>
        <p className="text-muted text-sm" style={{ marginTop: "4px" }}>
          Fast passwordless registration with your Telegram identity
        </p>
      </div>

      <div className="screen-content" style={{ maxWidth: "460px", margin: "0 auto", width: "100%", padding: "0 16px 40px" }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* a) Your Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullname">
              Your Full Name <span style={{ color: "#ff453a" }}>*</span>
            </label>
            <input
              id="reg-fullname"
              className={`form-input ${errors.fullName ? "error" : ""}`}
              type="text"
              placeholder="e.g. Dawit Haile"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
              autoComplete="name"
              disabled={loading}
              autoFocus
            />
            {errors.fullName && <span className="text-danger text-sm" style={{ color: "#ff453a", fontSize: "12px", marginTop: "4px", display: "block" }}>{errors.fullName}</span>}
          </div>

          {/* b) Phone Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">
              Phone Number <span style={{ color: "#ff453a" }}>*</span>
            </label>
            <input
              id="reg-phone"
              className={`form-input ${errors.phone ? "error" : ""}`}
              type="tel"
              placeholder="0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
              autoComplete="tel"
              disabled={loading}
            />
            <span className="form-hint" style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #8e8e93)", marginTop: "4px", display: "block" }}>
              Accepts 09..., 07..., or +2519...
            </span>
            {errors.phone && <span className="text-danger text-sm" style={{ color: "#ff453a", fontSize: "12px", marginTop: "4px", display: "block" }}>{errors.phone}</span>}
          </div>

          {/* c) Account Type (Segmented control) */}
          <div className="form-group">
            <label className="form-label">
              Account Type <span style={{ color: "#ff453a" }}>*</span>
            </label>
            <div
              style={{
                display: "flex",
                background: "var(--tg-theme-secondary-bg-color, #2c2c2e)",
                borderRadius: "10px",
                padding: "4px",
              }}
            >
              <button
                type="button"
                onClick={() => handleAccountTypeChange("business")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  background: accountType === "business" ? "var(--tg-theme-button-color, #0088cc)" : "transparent",
                  color: accountType === "business" ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
                  transition: "all 0.2s ease",
                }}
              >
                🏢 Business
              </button>
              <button
                type="button"
                onClick={() => handleAccountTypeChange("personal")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  background: accountType === "personal" ? "var(--tg-theme-button-color, #0088cc)" : "transparent",
                  color: accountType === "personal" ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
                  transition: "all 0.2s ease",
                }}
              >
                👤 Personal
              </button>
            </div>
          </div>

          {/* d) Business fields (conditional) */}
          {accountType === "business" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-bizname">
                  Business Name <span style={{ color: "#ff453a" }}>*</span>
                </label>
                <input
                  id="reg-bizname"
                  className={`form-input ${errors.businessName ? "error" : ""}`}
                  type="text"
                  placeholder="e.g. Haile Trading Enterprise"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, businessName: true }))}
                  disabled={loading}
                />
                {errors.businessName && (
                  <span className="text-danger text-sm" style={{ color: "#ff453a", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {errors.businessName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-branchcount">
                  Number of Branches <span style={{ color: "#ff453a" }}>*</span>
                </label>
                <input
                  id="reg-branchcount"
                  className={`form-input ${errors.branchCount ? "error" : ""}`}
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  placeholder="1"
                  value={branchCount}
                  onChange={(e) => setBranchCount(parseInt(e.target.value, 10) || 1)}
                  onBlur={() => setTouched((p) => ({ ...p, branchCount: true }))}
                  disabled={loading}
                />
                <span className="form-hint" style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #8e8e93)", marginTop: "4px", display: "block" }}>
                  Number of operational stores/branches (1 to 500)
                </span>
                {errors.branchCount && (
                  <span className="text-danger text-sm" style={{ color: "#ff453a", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    {errors.branchCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="reg-submit"
            type="submit"
            className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
            disabled={!canSubmit}
            style={{
              marginTop: "8px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: 700,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onGoLogin}
            disabled={loading}
            style={{ textAlign: "center", fontSize: "14px", color: "var(--tg-theme-hint-color, #8e8e93)" }}
          >
            Already have an account?{" "}
            <span style={{ color: "var(--tg-theme-button-color, #0088cc)", fontWeight: 600 }}>Sign In</span>
          </button>
        </form>
      </div>
    </div>
  );
}
