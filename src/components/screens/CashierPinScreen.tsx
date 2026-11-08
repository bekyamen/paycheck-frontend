"use client";
import { useState, useEffect } from "react";
import PinInput from "@/components/ui/PinInput";
import { cashierTokenLogin, type CashierInfo } from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface CashierPinScreenProps {
  /** branchId to authenticate against. Resolved by the caller from stored user data. */
  branchId: string;
  /** Display name of the branch shown on screen. */
  branchName?: string;
  /** Called with the new JWT and cashier details after a successful login. */
  onSuccess: (token: string, cashier: CashierInfo) => void;
  /** Let the user go back to the normal login screen. */
  onBack: () => void;
}

type PinState = "idle" | "loading" | "success" | "error";

export default function CashierPinScreen({
  branchId,
  branchName,
  onSuccess,
  onBack,
}: CashierPinScreenProps) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<PinState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cashierName, setCashierName] = useState("");

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && state === "idle") {
      void submit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit(currentPin: string) {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await cashierTokenLogin({ pin: currentPin, branchId });
      haptic("success");
      setCashierName(res.cashier.fullName);
      setState("success");

      // Brief success display, then hand off
      setTimeout(() => {
        onSuccess(res.token, res.cashier);
      }, 900);
    } catch (err: unknown) {
      haptic("error");
      const raw = (err as Error).message ?? "";
      let friendly = "Something went wrong. Please try again.";
      if (
        raw.includes("401") ||
        raw.includes("Unauthorized") ||
        raw.includes("Invalid") ||
        raw.includes("PIN") ||
        raw.includes("pin") ||
        raw.includes("mismatch")
      ) {
        friendly = "Wrong PIN — please try again.";
      } else if (raw.includes("400") || raw.includes("Missing") || raw.includes("required")) {
        friendly = "Branch information is missing. Please go back and try again.";
      } else if (raw.includes("Network")) {
        friendly = "No connection. Check your internet and try again.";
      }
      setErrorMsg(friendly);
      setState("error");
      // Reset PIN for retry
      setPin("");
      // After a beat, go back to idle so the user can type again
      setTimeout(() => setState("idle"), 500);
    }
  }

  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <div className="screen">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "var(--spacing-lg)",
          gap: "0",
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: isSuccess
                ? "linear-gradient(135deg, #30d158 0%, #00b09b 100%)"
                : "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              margin: "0 auto 20px",
              boxShadow: isSuccess
                ? "0 8px 32px rgba(48,209,88,0.4)"
                : "0 8px 32px rgba(10,132,255,0.35)",
              transition: "all 0.4s ease",
            }}
          >
            {isSuccess ? "✓" : "🔐"}
          </div>

          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "6px" }}>
            {isSuccess ? `Welcome, ${cashierName.split(" ")[0]}!` : "Cashier Sign-In"}
          </h1>

          {!isSuccess && (
            <p className="text-muted text-sm">
              {branchName ? (
                <>
                  Enter your 4-digit PIN for{" "}
                  <strong style={{ color: "var(--tg-theme-text-color)" }}>{branchName}</strong>
                </>
              ) : (
                "Enter your 4-digit PIN to continue"
              )}
            </p>
          )}

          {isSuccess && (
            <p className="text-sm" style={{ color: "#30d158", marginTop: "4px" }}>
              Signing you in…
            </p>
          )}
        </div>

        {/* PIN dots */}
        {!isSuccess && (
          <div style={{ marginBottom: "24px" }}>
            <PinInput
              value={pin}
              onChange={(v) => {
                if (!isLoading) {
                  setErrorMsg("");
                  setPin(v);
                }
              }}
              autoFocus
              error={undefined} // We show error below separately
            />
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <div className="spinner spinner-sm" />
            <p className="text-muted text-sm">Verifying…</p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && state !== "loading" && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,69,58,0.12)",
              border: "1px solid rgba(255,69,58,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "4px",
              animation: "slideDown 200ms ease",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                color: "var(--tg-theme-destructive-text-color)",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✕
            </span>
            <p
              style={{
                fontSize: "14px",
                color: "var(--tg-theme-destructive-text-color)",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {errorMsg}
            </p>
          </div>
        )}

        {/* Hint */}
        {!isLoading && !isSuccess && !errorMsg && (
          <p
            className="text-muted text-xs"
            style={{ textAlign: "center", marginTop: "16px" }}
          >
            Your PIN is entered automatically once all 4 digits are typed.
          </p>
        )}

        {/* Back link */}
        {!isLoading && !isSuccess && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: "28px", textAlign: "center" }}
            onClick={() => {
              haptic("light");
              onBack();
            }}
          >
            ← Back to regular sign-in
          </button>
        )}
      </div>
    </div>
  );
}
