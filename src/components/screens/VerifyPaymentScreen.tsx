"use client";

import { useState } from "react";
import type { UserProfile, VerificationResult } from "@/lib/api";
import { verifyManual, verifyImage } from "@/lib/api";
import { compressReceiptImage } from "@/lib/imageCompressor";
import { haptic } from "@/lib/telegram";
import LiveReceiptScanner from "@/components/ui/LiveReceiptScanner";

interface VerifyPaymentScreenProps {
  user: UserProfile;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onLogout?: () => void;
}

type VerifyTab = "scan" | "image" | "manual";

export default function VerifyPaymentScreen({ user, showToast, onLogout }: VerifyPaymentScreenProps) {
  const [tab, setTab] = useState<VerifyTab>("scan");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Manual form state
  const [provider, setProvider] = useState("CBE");
  const [txnReference, setTxnReference] = useState("");
  const [amount, setAmount] = useState("");

  // Image upload form state
  const [file, setFile] = useState<File | null>(null);

  // Common loading & result states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  async function handleVerifyManual(e: React.FormEvent) {
    e.preventDefault();
    if (!txnReference.trim()) {
      showToast("Please enter a transaction reference (e.g. FT...)", "error");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("Please enter a valid payment amount", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await verifyManual({
        provider,
        txnReference: txnReference.trim(),
        amount: numAmount,
      });
      setResult(res);
      handleResultHaptic(res.status);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Verification failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyImage(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      showToast("Please select a receipt image or screenshot", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      // Compress before upload for rapid mobile transfer
      showToast("Optimizing receipt...", "info");
      const compressed = await compressReceiptImage(file, {
        maxDimension: 1400,
        quality: 0.85,
        fileName: file.name,
      });

      const res = await verifyImage(compressed, undefined, provider);
      setFile(null);
      const fileEl = document.getElementById("receipt-file") as HTMLInputElement | null;
      if (fileEl) fileEl.value = "";
      setResult(res);
      handleResultHaptic(res.status);
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Image verification failed", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleResultHaptic(status?: string) {
    if (status === "VERIFIED") {
      haptic("success");
    } else {
      haptic("error");
    }
  }

  const isWrongReceiver = Boolean(
    result && /wrong receiver|receiver account mismatch|receiver mismatch|not to your registered/i.test(result.message || "")
  );

  const isUnreadable = Boolean(
    result &&
      !isWrongReceiver &&
      (result.status === "INVALID_RECEIPT" ||
        result.status === "INVALID" ||
        result.status === "FAILED_UPSTREAM" ||
        result.status === "UNKNOWN" ||
        result.status === "FAILED")
  );

  return (
    <div className="screen">
      {/* ── LIVE CAMERA SCANNER MODAL ── */}
      {isScannerOpen && (
        <LiveReceiptScanner
          onClose={() => setIsScannerOpen(false)}
          onVerified={(verifiedRes) => {
            setResult(verifiedRes);
            setIsScannerOpen(false);
          }}
          showToast={showToast}
        />
      )}

      {/* Screen Header */}
      <div className="screen-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="screen-title">Verify Payment</h1>
            <p className="text-muted text-xs" style={{ marginTop: "2px" }}>
              Staff Cashier: <strong>{user.fullName}</strong>
            </p>
          </div>
          {onLogout && !user.isAdmin && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onLogout}
              style={{ fontSize: "13px", padding: "6px 12px", color: "var(--tg-theme-destructive-text-color, #ff453a)" }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div className="screen-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Method Selector Tabs: Scan Receipt | Upload Image | Manual Entry */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: "var(--tg-theme-secondary-bg-color, #2c2c2e)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            gap: "4px",
          }}
        >
          {[
            { id: "scan", label: "Scan Camera", icon: "📷" },
            { id: "image", label: "Upload Image", icon: "📁" },
            { id: "manual", label: "Manual Entry", icon: "✍️" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                haptic("selection");
                setTab(t.id as VerifyTab);
                if (t.id === "scan") {
                  setIsScannerOpen(true);
                }
              }}
              style={{
                padding: "10px 4px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                background: tab === t.id ? "var(--tg-theme-button-color, #0a84ff)" : "transparent",
                color: tab === t.id ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "16px" }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── 1. SCAN RECEIPT (LIVE CAMERA) CARD ── */}
        {tab === "scan" && (
          <div
            className="card"
            style={{
              padding: "24px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              border: "1px solid rgba(10, 132, 255, 0.3)",
              background: "linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(44, 44, 46, 0.6) 100%)",
            }}
          >
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "rgba(10, 132, 255, 0.2)",
                color: "var(--tg-theme-button-color, #0a84ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
                boxShadow: "0 4px 20px rgba(10, 132, 255, 0.25)",
              }}
            >
              📷
            </div>

            <div>
              <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0 }}>
                Live Receipt Scanner
              </h2>
              <p className="text-muted text-xs" style={{ marginTop: "6px", maxWidth: "280px" }}>
                Point your phone camera at any CBE or Telebirr receipt to verify automatically in seconds.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                haptic("selection");
                setIsScannerOpen(true);
              }}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "16px",
                fontWeight: 700,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 16px rgba(10, 132, 255, 0.35)",
              }}
            >
              <span>📷</span> Open Camera Scanner
            </button>

            <p className="text-muted" style={{ fontSize: "11px", margin: 0 }}>
              Auto-reads QR codes, reference numbers, and validates payment with the bank.
            </p>
          </div>
        )}

        {/* ── 2. IMAGE UPLOAD FORM ── */}
        {tab === "image" && (
          <form onSubmit={handleVerifyImage} className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label">Payment Provider</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {["CBE", "TELEBIRR"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      haptic("selection");
                      setProvider(p);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      border: provider === p ? "2px solid var(--tg-theme-button-color, #0a84ff)" : "1px solid var(--glass-border)",
                      background: provider === p ? "rgba(10, 132, 255, 0.15)" : "transparent",
                      color: provider === p ? "var(--tg-theme-button-color, #0a84ff)" : "inherit",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {p === "CBE" ? "🏦 CBE Bank" : "📱 Telebirr"}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="receipt-file">Upload Receipt Screenshot / Photo</label>
              <input
                id="receipt-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
                style={{
                  background: "var(--tg-theme-bg-color)",
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  color: "inherit",
                }}
              />
              <p className="text-muted text-xs" style={{ marginTop: "4px" }}>
                Upload customer screenshot or receipt camera photo. Images are automatically compressed and checked against bank records.
              </p>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Checking Receipt..." : "⚡ Scan & Verify Receipt"}
            </button>
          </form>
        )}

        {/* ── 3. MANUAL ENTRY FORM ── */}
        {tab === "manual" && (
          <form onSubmit={handleVerifyManual} className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label">Payment Provider</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {["CBE", "TELEBIRR"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      border: provider === p ? "2px solid var(--tg-theme-button-color, #0a84ff)" : "1px solid var(--glass-border)",
                      background: provider === p ? "rgba(10, 132, 255, 0.15)" : "transparent",
                      color: provider === p ? "var(--tg-theme-button-color, #0a84ff)" : "inherit",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {p === "CBE" ? "🏦 CBE Bank" : "📱 Telebirr"}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="txn-ref">Transaction Reference</label>
              <input
                id="txn-ref"
                className="form-input"
                type="text"
                placeholder={provider === "CBE" ? "e.g. FT2600000001" : "e.g. 10-digit Telebirr Ref"}
                value={txnReference}
                onChange={(e) => setTxnReference(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="txn-amount">Amount (ETB)</label>
              <input
                id="txn-amount"
                className="form-input"
                type="number"
                step="any"
                placeholder="e.g. 150.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
              disabled={loading}
              style={{ marginTop: "4px" }}
            >
              {loading ? "Checking Reference..." : "Verify Payment"}
            </button>
          </form>
        )}

        {/* ── VERIFICATION RESULT BANNER ── */}
        {result && (
          <div
            className="card"
            style={{
              padding: "20px",
              border: result.status === "VERIFIED"
                ? "2px solid #30d158"
                : result.status === "FLAGGED_DUPLICATE"
                ? "2px solid #ff453a"
                : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                ? "2px solid #ff9f0a"
                : "2px solid #ff453a",
              background: result.status === "VERIFIED"
                ? "rgba(48, 209, 88, 0.12)"
                : result.status === "FLAGGED_DUPLICATE"
                ? "rgba(255, 69, 58, 0.12)"
                : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                ? "rgba(255, 159, 10, 0.14)"
                : "rgba(255, 69, 58, 0.12)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            {/* Status header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: result.status === "VERIFIED"
                    ? "#30d158"
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "#ff453a"
                    : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                    ? "#ff9f0a"
                    : "#ff453a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: result.status === "AMOUNT_MISMATCH" || isWrongReceiver ? "#000" : "#fff",
                  flexShrink: 0,
                }}
              >
                {result.status === "VERIFIED" ? "✓" : result.status === "FLAGGED_DUPLICATE" ? "✕" : result.status === "AMOUNT_MISMATCH" || isWrongReceiver ? "!" : "✕"}
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800 }}>
                  {result.status === "VERIFIED"
                    ? "Payment Verified!"
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "Duplicate Payment!"
                    : result.status === "AMOUNT_MISMATCH"
                    ? "Amount Mismatch"
                    : isWrongReceiver
                    ? "Wrong Receiver — Not Accepted"
                    : "Verification Failed"}
                </h3>
                <p className="text-muted text-xs">
                  {result.status === "VERIFIED"
                    ? "This payment is legitimate and credited to your receiving account."
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "Warning: This receipt was already verified previously! Do not deliver goods."
                    : result.status === "AMOUNT_MISMATCH"
                    ? "Amount on receipt does not match expected amount."
                    : result.message || "Could not confirm payment."}
                </p>
              </div>
            </div>

            {/* Friendly tip for blurry or unreadable photos */}
            {isUnreadable && (
              <div
                style={{
                  background: "rgba(255, 214, 10, 0.15)",
                  border: "1px solid rgba(255, 214, 10, 0.3)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  margin: "10px 0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "16px" }}>💡</span>
                <span style={{ fontSize: "12px", color: "#ffd60a", fontWeight: 500 }}>
                  <strong>Tip:</strong> Hold steady, use good light, and keep receipt clear.
                </span>
              </div>
            )}

            {/* Details table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", marginTop: "12px" }}>
              {result.amount !== undefined && result.amount !== null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Verified Amount:</span>
                  <strong style={{ fontSize: "16px", color: result.status === "VERIFIED" ? "#30d158" : "inherit" }}>
                    {!isNaN(Number(result.amount))
                      ? Number(result.amount).toFixed(2)
                      : String(result.amount)}{" "}
                    ETB
                  </strong>
                </div>
              )}
              {result.txnReference && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Ref:</span>
                  <code>{result.txnReference}</code>
                </div>
              )}
              {result.payerName && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Payer:</span>
                  <span>{result.payerName}</span>
                </div>
              )}
              {result.payerPhone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Payer Phone:</span>
                  <span>{result.payerPhone}</span>
                </div>
              )}
              {result.receivingAccount && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Paid To:</span>
                  <span>{result.receivingAccount}</span>
                </div>
              )}
              {result.provider && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Bank/Provider:</span>
                  <span>{result.provider}</span>
                </div>
              )}
              {result.verifiedAt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Verified At:</span>
                  <span>{new Date(result.verifiedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Scan Another Receipt Button */}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  haptic("selection");
                  setResult(null);
                  setIsScannerOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>📷</span> Scan Another Receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
