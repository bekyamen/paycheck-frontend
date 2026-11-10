"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  UserProfile,
  VerificationResult,
  VerificationHistoryRange,
  VerificationHistoryItem,
} from "@/lib/api";
import {
  verifyManual,
  verifyText,
  verifyUrl,
  verifyImageWithProgress,
  getVerificationHistory,
} from "@/lib/api";
import { compressReceiptImage } from "@/lib/imageCompressor";
import { haptic } from "@/lib/telegram";
import LiveReceiptScanner from "@/components/ui/LiveReceiptScanner";

interface VerifyPaymentScreenProps {
  user: UserProfile;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onLogout?: () => void;
}

type VerifyTab = "photo" | "ref";
type RefSubMode = "manual" | "sms";

const RANGE_META: Record<VerificationHistoryRange, { btn: string; caption: string }> = {
  today: { btn: "Today", caption: "Verified today" },
  week: { btn: "Last 7 days", caption: "Verified (7d)" },
  month: { btn: "Last 30 days", caption: "Verified (30d)" },
  all: { btn: "All time", caption: "Verified total" },
};

function formatEtbAmount(num: number): string {
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRecentTimestamp(isoStr: string | null): { dateText: string; agoText: string } {
  if (!isoStr) return { dateText: "—", agoText: "" };
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return { dateText: "—", agoText: "" };

  const dateText = d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  let agoText = "Just now";
  if (diffMin >= 1440) {
    const days = Math.floor(diffMin / 1440);
    const hrs = Math.floor((diffMin % 1440) / 60);
    agoText = `${days}d ${hrs}h ago`;
  } else if (diffMin >= 60) {
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    agoText = `${hrs}h ${mins}m ago`;
  } else if (diffMin >= 1) {
    agoText = `${diffMin}m ago`;
  }
  return { dateText, agoText };
}

function ProviderBadgeIcon({ provider }: { provider: string }) {
  const upper = provider.toUpperCase();
  if (upper === "TELEBIRR") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3v8M8 7h8M12 11c3.5 0 6 2.5 6 5.5S15.5 21 12 21s-6-2.5-6-5.5"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (upper === "CBE") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polygon points="12,3 14.7,9 21,9.5 16,13.8 17.5,20 12,16.8 6.5,20 8,13.8 3,9.5 9.3,9" fill="#f59e0b" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2">
      <path d="M3 10h18M5 10v8M10 10v8M14 10v8M19 10v8M2 20h20M12 3l10 5H2l10-5z" />
    </svg>
  );
}

export default function VerifyPaymentScreen({ user, showToast, onLogout }: VerifyPaymentScreenProps) {
  const [tab, setTab] = useState<VerifyTab>("photo");
  const [refSubMode, setRefSubMode] = useState<RefSubMode>("manual");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Date filter + summary gauge + recent feed
  const [range, setRange] = useState<VerificationHistoryRange>("today");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [summaryAmount, setSummaryAmount] = useState(0);
  const [summaryCount, setSummaryCount] = useState(0);
  const [byProvider, setByProvider] = useState<Record<string, { amount: number; count: number }>>({});
  const [recentItems, setRecentItems] = useState<VerificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Quick photo upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const dateMenuRef = useRef<HTMLDivElement | null>(null);

  // Reference / SMS form state
  const [provider, setProvider] = useState<"CBE" | "TELEBIRR">("CBE");
  const [txnReference, setTxnReference] = useState("");
  const [amount, setAmount] = useState("");
  const [smsText, setSmsText] = useState("");
  const [smsExpectedAmount, setSmsExpectedAmount] = useState("");

  // Active result card
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const loadHistory = useCallback(async (targetRange: VerificationHistoryRange) => {
    try {
      const data = await getVerificationHistory(targetRange, 15);
      setSummaryAmount(Number(data?.summary?.totalAmount || 0));
      setSummaryCount(Number(data?.summary?.totalCount || 0));
      setByProvider(data?.summary?.byProvider || {});
      setRecentItems(Array.isArray(data?.recent) ? data.recent : []);
    } catch {
      // Keep UI functional even if history fails temporarily
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getVerificationHistory(range, 15)
      .then((data) => {
        if (!active) return;
        setSummaryAmount(Number(data?.summary?.totalAmount || 0));
        setSummaryCount(Number(data?.summary?.totalCount || 0));
        setByProvider(data?.summary?.byProvider || {});
        setRecentItems(Array.isArray(data?.recent) ? data.recent : []);
      })
      .catch(() => {
        // Keep UI functional even if history fails temporarily
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setRangeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleResultHaptic(status?: string) {
    if (status === "VERIFIED") haptic("success");
    else haptic("error");
  }

  async function handleQuickUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setResult(null);
    showToast("Optimizing & verifying receipt...", "info");

    try {
      const compressed = await compressReceiptImage(file, {
        maxDimension: 1400,
        maxHeight: 2600,
        quality: 0.85,
        fileName: file.name,
      });

      const res = await verifyImageWithProgress(compressed);
      setResult(res);
      handleResultHaptic(res.status);
      void loadHistory(range);
    } catch (err: unknown) {
      haptic("error");
      const msg = (err as Error).message || "Image verification failed";
      setResult({ status: "INVALID_RECEIPT", message: msg });
      showToast(msg, "error");
    } finally {
      setUploadingImage(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

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
      void loadHistory(range);
    } catch (err: unknown) {
      haptic("error");
      const msg = (err as Error).message || "Verification failed";
      setResult({ status: "INVALID_RECEIPT", message: msg });
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySms(e: React.FormEvent) {
    e.preventDefault();
    const raw = smsText.trim();
    if (!raw || raw.length < 5) {
      showToast("Paste the SMS confirmation or receipt link first", "error");
      return;
    }
    const parsedExp = smsExpectedAmount.trim() ? parseFloat(smsExpectedAmount) : undefined;
    const expectedAmount = parsedExp && parsedExp > 0 ? parsedExp : undefined;

    setLoading(true);
    setResult(null);
    try {
      const isPureUrl = /^https:\/\/\S+$/i.test(raw);
      const res = isPureUrl
        ? await verifyUrl({ receiptUrl: raw, expectedAmount })
        : await verifyText({ rawText: raw, expectedAmount });
      setResult(res);
      handleResultHaptic(res.status);
      void loadHistory(range);
    } catch (err: unknown) {
      haptic("error");
      const msg = (err as Error).message || "SMS/Link verification failed";
      setResult({ status: "INVALID_RECEIPT", message: msg });
      showToast(msg, "error");
    } finally {
      setLoading(false);
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

  // Compute circular gauge geometry (344° C-arc with symmetric gap at 12 o'clock)
  const ringR = 88;
  const ringC = 2 * Math.PI * ringR;
  const arcSpan = ringC * (344 / 360);
  const providerColors: Record<string, string> = {
    TELEBIRR: "#00a6fb",
    CBE: "#f59e0b",
    BOA: "#a855f7",
  };
  const providerEntries = Object.entries(byProvider).filter(([, v]) => Number(v?.amount || 0) > 0);
  const ringSegments = providerEntries.reduce<Array<{ provider: string; color: string; len: number; offset: number }>>(
    (acc, [prov, info]) => {
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
      const share = summaryAmount > 0 ? Number(info.amount) / summaryAmount : 0;
      const len = Math.max(8, arcSpan * share);
      acc.push({ provider: prov, color: providerColors[prov] || "#30d158", len, offset: prevOffset });
      return acc;
    },
    []
  );

  return (
    <div className="cf-vp-screen">
      {/* ── LIVE CAMERA SCANNER MODAL ── */}
      {isScannerOpen && (
        <LiveReceiptScanner
          onClose={() => setIsScannerOpen(false)}
          onVerified={(verifiedRes) => {
            setResult(verifiedRes);
            setIsScannerOpen(false);
            void loadHistory(range);
          }}
          showToast={showToast}
        />
      )}

      {/* Hidden quick photo / PDF upload input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={handleQuickUploadChange}
      />

      {/* ── TOP HEADER & DATE FILTER ── */}
      <div className="cf-vp-topbar">
        <div className="cf-vp-brand-pill">
          <span>⚡</span>
          <span>{user.fullName.split(" ")[0]}</span>
        </div>

        <div className="cf-vp-top-actions">
          {onLogout && !user.isAdmin && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                background: "rgba(255, 69, 58, 0.14)",
                border: "1px solid rgba(255, 69, 58, 0.28)",
                color: "#ff6b63",
                fontSize: "12px",
                fontWeight: 700,
                padding: "6px 10px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          )}

          <div ref={dateMenuRef} className="cf-vp-date-wrap">
            <button
              type="button"
              className="cf-vp-date-btn"
              onClick={() => {
                haptic("selection");
                setRangeMenuOpen((prev) => !prev);
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{RANGE_META[range].btn}</span>
              <span style={{ fontSize: "10px", opacity: 0.75 }}>▾</span>
            </button>

            {rangeMenuOpen && (
              <div className="cf-vp-date-menu">
                {(Object.keys(RANGE_META) as VerificationHistoryRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`cf-vp-date-opt ${range === r ? "active" : ""}`}
                    onClick={() => {
                      haptic("selection");
                      setRange(r);
                      setRangeMenuOpen(false);
                    }}
                  >
                    {RANGE_META[r].btn}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CIRCULAR VERIFIED SUMMARY GAUGE ── */}
      <div className="cf-vp-ring-wrap">
        <svg className="cf-vp-ring-svg" viewBox="0 0 220 220" aria-hidden="true">
          {summaryAmount <= 0 || summaryCount <= 0 ? (
            <circle
              cx="110"
              cy="110"
              r={ringR}
              fill="none"
              stroke="#6c7179"
              strokeWidth="17"
              strokeLinecap="round"
              strokeDasharray={`${arcSpan.toFixed(2)} ${ringC.toFixed(2)}`}
              transform="rotate(-82 110 110)"
            />
          ) : (
            <>
              <circle
                cx="110"
                cy="110"
                r={ringR}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="17"
                strokeLinecap="round"
                strokeDasharray={`${arcSpan.toFixed(2)} ${ringC.toFixed(2)}`}
                transform="rotate(-82 110 110)"
              />
              {ringSegments.map((seg) => (
                <circle
                  key={seg.provider}
                  cx="110"
                  cy="110"
                  r={ringR}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="17"
                  strokeLinecap="round"
                  strokeDasharray={`${seg.len.toFixed(2)} ${ringC.toFixed(2)}`}
                  strokeDashoffset={-seg.offset}
                  transform="rotate(-82 110 110)"
                />
              ))}
            </>
          )}
        </svg>

        {/* Subtle watermark provider marks */}
        <svg className="cf-vp-ring-watermark" viewBox="0 0 220 220" aria-hidden="true" style={{ opacity: 0.14 }}>
          <polygon points="82,48 85,54 91,54 86,58 88,64 82,60 76,64 78,58 73,54 79,54" fill="#eab308" />
          <circle cx="122" cy="46" r="7" fill="none" stroke="#9ca3af" strokeWidth="2" />
          <path d="M148 66c4-3 10-3 14 0M146 72c6-3 12-3 18 0" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M52 106h12M58 100v12" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </svg>

        <div className="cf-vp-ring-center">
          <div className="cf-vp-ring-label">{RANGE_META[range].caption}</div>
          <div className="cf-vp-ring-amount">ETB {formatEtbAmount(summaryAmount)}</div>
          <div className="cf-vp-ring-count">
            {summaryCount} {summaryCount === 1 ? "payment" : "payments"}
          </div>
        </div>
      </div>

      {/* ── 2-OPTION SEGMENTED SWITCHER ── */}
      <div className="cf-vp-seg-bar" role="tablist" aria-label="Verification method">
        <button
          type="button"
          className={`cf-vp-seg-btn ${tab === "photo" ? "active" : ""}`}
          onClick={() => {
            haptic("selection");
            setTab("photo");
          }}
        >
          Photo / Scan
        </button>
        <button
          type="button"
          className={`cf-vp-seg-btn ${tab === "ref" ? "active" : ""}`}
          onClick={() => {
            haptic("selection");
            setTab("ref");
          }}
        >
          Reference / SMS
        </button>
      </div>

      {/* ── PHOTO / SCAN ACTIONS ── */}
      {tab === "photo" && (
        <div className="cf-vp-cta-row">
          <button
            type="button"
            className="cf-vp-take-btn"
            onClick={() => {
              haptic("selection");
              setIsScannerOpen(true);
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111827"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Take a picture</span>
          </button>

          <button
            type="button"
            className="cf-vp-upload-btn"
            disabled={uploadingImage}
            onClick={() => {
              haptic("selection");
              uploadInputRef.current?.click();
            }}
            aria-label="Upload receipt image or PDF"
            title="Upload screenshot or photo"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e5a922"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: uploadingImage ? 0.45 : 1 }}
            >
              <rect x="3" y="5" width="14" height="14" rx="2.5" />
              <circle cx="7.5" cy="9.5" r="1.2" fill="#e5a922" stroke="none" />
              <path d="M4 17l4-4 3 3 2.5-2.5L17 17" />
              <path d="M19 9V3m0 0l-2.5 2.5M19 3l2.5 2.5" />
            </svg>
          </button>
        </div>
      )}

      {/* ── REFERENCE / SMS PANEL ── */}
      {tab === "ref" && (
        <div className="cf-vp-ref-card">
          <div className="cf-vp-ref-subtabs">
            <button
              type="button"
              className={`cf-vp-ref-subbtn ${refSubMode === "manual" ? "active" : ""}`}
              onClick={() => {
                haptic("selection");
                setRefSubMode("manual");
              }}
            >
              Reference Number
            </button>
            <button
              type="button"
              className={`cf-vp-ref-subbtn ${refSubMode === "sms" ? "active" : ""}`}
              onClick={() => {
                haptic("selection");
                setRefSubMode("sms");
              }}
            >
              Paste SMS / Link
            </button>
          </div>

          {refSubMode === "manual" ? (
            <form onSubmit={handleVerifyManual} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Bank / Provider</label>
                <div className="cf-vp-prov-row">
                  {(["CBE", "TELEBIRR"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`cf-vp-prov-btn ${provider === p ? "active" : ""}`}
                      onClick={() => {
                        haptic("selection");
                        setProvider(p);
                      }}
                    >
                      {p === "CBE" ? "🏦 CBE Bank" : "📱 Telebirr"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="txn-ref">
                  Transaction Reference
                </label>
                <input
                  id="txn-ref"
                  className="form-input"
                  type="text"
                  placeholder={provider === "CBE" ? "e.g. FT26286ZF0XC" : "e.g. DA83..."}
                  value={txnReference}
                  onChange={(e) => setTxnReference(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="txn-amount">
                  Amount (ETB)
                </label>
                <input
                  id="txn-amount"
                  className="form-input"
                  type="number"
                  step="any"
                  placeholder="e.g. 500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className={`btn btn-primary ${loading ? "btn-loading" : ""}`} disabled={loading}>
                {loading ? "Checking Reference..." : "⚡ Verify Reference"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySms} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="sms-raw-input">
                  SMS Confirmation or Receipt URL
                </label>
                <textarea
                  id="sms-raw-input"
                  className="form-input"
                  rows={3}
                  placeholder="Paste full Telebirr / CBE confirmation SMS or https:// receipt link..."
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  disabled={loading}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sms-expected-amount">
                  Expected Amount (Optional)
                </label>
                <input
                  id="sms-expected-amount"
                  className="form-input"
                  type="number"
                  step="any"
                  placeholder="e.g. 500.00"
                  value={smsExpectedAmount}
                  onChange={(e) => setSmsExpectedAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className={`btn btn-primary ${loading ? "btn-loading" : ""}`} disabled={loading}>
                {loading ? "Verifying SMS / Link..." : "⚡ Verify SMS / Link"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── ACTIVE VERIFICATION RESULT CARD ── */}
      {result && (
        <div
          className="card"
          style={{
            marginBottom: "18px",
            padding: "16px",
            border:
              result.status === "VERIFIED"
                ? "2px solid #30d158"
                : result.status === "FLAGGED_DUPLICATE"
                ? "2px solid #ff453a"
                : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                ? "2px solid #ff9f0a"
                : "2px solid #ff453a",
            background:
              result.status === "VERIFIED"
                ? "rgba(48, 209, 88, 0.12)"
                : result.status === "FLAGGED_DUPLICATE"
                ? "rgba(255, 69, 58, 0.12)"
                : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                ? "rgba(255, 159, 10, 0.14)"
                : "rgba(255, 69, 58, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background:
                    result.status === "VERIFIED"
                      ? "#30d158"
                      : result.status === "AMOUNT_MISMATCH" || isWrongReceiver
                      ? "#ff9f0a"
                      : "#ff453a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: result.status === "AMOUNT_MISMATCH" || isWrongReceiver ? "#000" : "#fff",
                  flexShrink: 0,
                }}
              >
                {result.status === "VERIFIED" ? "✓" : result.status === "AMOUNT_MISMATCH" || isWrongReceiver ? "!" : "✕"}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: "17px", fontWeight: 800 }}>
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
                <p className="text-muted text-xs" style={{ marginTop: "2px" }}>
                  {result.status === "VERIFIED"
                    ? "Legitimate payment received in your designated account."
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "Warning: This receipt was already verified! Do NOT release goods."
                    : result.status === "AMOUNT_MISMATCH"
                    ? "Amount on receipt does not match expected payment."
                    : result.message || "Could not confirm payment."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label="Close result"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "#cfd6e2",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {isUnreadable && (
            <div
              style={{
                background: "rgba(255, 214, 10, 0.15)",
                border: "1px solid rgba(255, 214, 10, 0.3)",
                borderRadius: "10px",
                padding: "10px 12px",
                margin: "8px 0 12px",
                fontSize: "12px",
                color: "#ffd60a",
              }}
            >
              💡 <strong>Tip:</strong> Hold steady, use good light, and keep the whole receipt clear.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13.5px" }}>
            {result.amount !== undefined && result.amount !== null && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Verified Amount:</span>
                <strong>
                  {!isNaN(Number(result.amount)) ? Number(result.amount).toFixed(2) : String(result.amount)} ETB
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
            {result.receivingAccount && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Paid To:</span>
                <span>{result.receivingAccount}</span>
              </div>
            )}
            {result.provider && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Provider:</span>
                <span>{result.provider}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECENT VERIFICATIONS SECTION ── */}
      <div className="cf-vp-recent-hdr">
        <span className="cf-vp-recent-title">RECENT</span>
      </div>

      <div className="cf-vp-recent-list">
        {historyLoading ? (
          <div className="cf-vp-tx-card" style={{ justifyContent: "center", color: "#8c96a6", fontSize: "13px" }}>
            Loading recent activity...
          </div>
        ) : recentItems.length === 0 ? (
          <div className="cf-vp-tx-card" style={{ justifyContent: "center", color: "#8c96a6", fontSize: "13px" }}>
            No recent verifications yet. Scan or upload a receipt above.
          </div>
        ) : (
          recentItems.map((tx) => {
            const prov = String(tx.provider || "CBE").toUpperCase();
            const isVerified = tx.status === "VERIFIED";
            const isDup = tx.status === "FLAGGED_DUPLICATE";
            const isMismatch = tx.status === "AMOUNT_MISMATCH";

            const badgeClass = isVerified
              ? "verified"
              : isDup
              ? "duplicate"
              : isMismatch
              ? "mismatch"
              : "failed";
            const badgeText = isVerified
              ? "Verified"
              : isDup
              ? "Duplicate"
              : isMismatch
              ? "Mismatch"
              : "Failed";
            const dotColor = isVerified ? "#22c55e" : isMismatch ? "#f59e0b" : "#ef4444";

            const sub = tx.payerName || (tx.receivingAccount ? `To ${tx.receivingAccount}` : "Receipt check");
            const { dateText, agoText } = formatRecentTimestamp(tx.verifiedAt || tx.createdAt);

            return (
              <div key={tx.id} className="cf-vp-tx-card">
                <div className="cf-vp-tx-icon">
                  <ProviderBadgeIcon provider={prov} />
                  <span className="cf-vp-tx-dot" style={{ background: dotColor }} />
                </div>

                <div className="cf-vp-tx-main">
                  <div className="cf-vp-tx-prov">{prov}</div>
                  <div className="cf-vp-tx-sub">{sub}</div>
                  <span className={`cf-vp-tx-badge ${badgeClass}`}>{badgeText}</span>
                </div>

                <div className="cf-vp-tx-right">
                  <div className="cf-vp-tx-amt">ETB {formatEtbAmount(tx.amount)}</div>
                  <div className="cf-vp-tx-ref">{tx.txnReference || "—"}</div>
                  <div className="cf-vp-tx-date">{dateText}</div>
                  {agoText && <div className="cf-vp-tx-ago">{agoText}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
