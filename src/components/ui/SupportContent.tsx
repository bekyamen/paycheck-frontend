"use client";

import React, { useState, useEffect } from "react";
import { SUPPORT_CONFIG, getAddisAbabaOfficeStatus, type OfficeHoursStatus } from "@/config/support";
import { haptic } from "@/lib/telegram";

export interface SupportContentProps {
  onBack?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  isStandalonePage?: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  icon?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "status-meanings",
    icon: "🔍",
    question: "What does each verification status mean?",
    answer: (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", lineHeight: "1.5" }}>
        <div>
          <strong style={{ color: "#30d158" }}>✅ VERIFIED (ተረጋግጧል):</strong>
          <p style={{ margin: "2px 0 0", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
            The payment receipt has been matched and verified directly against CBE or Telebirr bank records. The settled amount and account match your business. It is 100% safe to release items or complete service.
          </p>
        </div>
        <div>
          <strong style={{ color: "#ff453a" }}>🔄 FLAGGED_DUPLICATE (የተደገመ ደረሰኝ):</strong>
          <p style={{ margin: "2px 0 0", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
            Warning! This exact transaction reference has already been verified earlier. <strong>Do NOT release items</strong> a second time for the same receipt.
          </p>
        </div>
        <div>
          <strong style={{ color: "#ffd60a" }}>⚠️ AMOUNT_MISMATCH:</strong>
          <p style={{ margin: "2px 0 0", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
            The actual amount deposited to your account does not match the expected sale total. Check the receipt details carefully.
          </p>
        </div>
        <div>
          <strong style={{ color: "#ff453a" }}>❌ INVALID_RECEIPT / UNREADABLE:</strong>
          <p style={{ margin: "2px 0 0", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
            The receipt is unrecognized, altered, from an unsupported bank, or the photo was too blurry to read.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "good-photo",
    icon: "📸",
    question: "How do I take a good receipt photo?",
    answer: (
      <div style={{ fontSize: "13.5px", lineHeight: "1.5", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
        <ul style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>
            <strong style={{ color: "#ffffff" }}>Place flat & use good light:</strong> Lay the customer’s phone screen or printed paper flat on a counter. Avoid direct glare or strong shadows over the text.
          </li>
          <li>
            <strong style={{ color: "#ffffff" }}>Frame the entire receipt:</strong> Ensure the reference number (e.g. <code>FT...</code> for CBE or <code>DKC...</code> for Telebirr), amount, and QR code are completely inside the camera.
          </li>
          <li>
            <strong style={{ color: "#ffffff" }}>Hold steady:</strong> Hold your phone still for a split second until the camera focuses cleanly.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "bot-not-replying",
    icon: "⚡",
    question: "What if the Bot or Scanner is not replying?",
    answer: (
      <div style={{ fontSize: "13.5px", lineHeight: "1.5", color: "var(--tg-theme-hint-color, #94a3b8)" }}>
        <ul style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>
            <strong style={{ color: "#ffffff" }}>Check connection:</strong> Make sure your mobile data or WiFi is active and connected.
          </li>
          <li>
            <strong style={{ color: "#ffffff" }}>Bank portal delays:</strong> During heavy banking hours, CBE or Ethio Telecom servers may take 5–10 seconds to respond. Please wait a moment or tap <em>Retake</em>.
          </li>
          <li>
            <strong style={{ color: "#ffffff" }}>Manual reference fallback:</strong> You can always switch to the <em>"Ref / Code"</em> tab on the Verify screen to type the reference number manually.
          </li>
          <li>
            <strong style={{ color: "#ffffff" }}>Need help now?</strong> Tap <em>"Chat on Telegram"</em> or call our support team directly using the buttons above.
          </li>
        </ul>
      </div>
    ),
  },
];

export default function SupportContent({ onBack, showToast, isStandalonePage = false }: SupportContentProps) {
  const [officeStatus, setOfficeStatus] = useState<OfficeHoursStatus>(() => getAddisAbabaOfficeStatus());
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>("status-meanings");

  // Keep office status updated
  useEffect(() => {
    const timer = setInterval(() => {
      setOfficeStatus(getAddisAbabaOfficeStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleTelegramClick = () => {
    haptic("selection");
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
    const url = SUPPORT_CONFIG.telegramUrl;

    if (tg && typeof tg.openTelegramLink === "function") {
      tg.openTelegramLink(url);
    } else if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyNumber = async () => {
    haptic("selection");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SUPPORT_CONFIG.phoneNumber);
      } else {
        const ta = document.createElement("textarea");
        ta.value = SUPPORT_CONFIG.phoneNumber;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      showToast?.("Phone number copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast?.("Could not copy number", "error");
    }
  };

  const toggleFaq = (id: string) => {
    haptic("selection");
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const telegramDisplay = SUPPORT_CONFIG.telegramUsername.startsWith("@")
    ? SUPPORT_CONFIG.telegramUsername
    : `@${SUPPORT_CONFIG.telegramUsername}`;

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        padding: isStandalonePage ? "20px 16px 60px" : "12px 0 24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Top Bar / Header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onBack && (
            <button
              type="button"
              onClick={() => {
                haptic("selection");
                onBack();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                width: "38px",
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                cursor: "pointer",
              }}
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div>
            <h1
              style={{
                fontSize: isStandalonePage ? "24px" : "22px",
                fontWeight: 800,
                color: "var(--tg-theme-text-color, #ffffff)",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Support & Contact
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--tg-theme-hint-color, #8fa0b5)",
                margin: "2px 0 0",
              }}
            >
              Need help? Our customer team is here for you.
            </p>
          </div>
        </div>

        {/* Dynamic Open / Closed Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 11px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            background: officeStatus.isOpen ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
            color: officeStatus.isOpen ? "#30d158" : "#ff453a",
            border: `1px solid ${officeStatus.isOpen ? "rgba(48, 209, 88, 0.35)" : "rgba(255, 69, 58, 0.35)"}`,
            flexShrink: 0,
          }}
          title={`${officeStatus.detail} (Addis Ababa Time)`}
        >
          <span>{officeStatus.badgeLabel}</span>
        </div>
      </div>

      {/* ── Working Hours Card ───────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: "var(--glass-bg, rgba(10, 18, 36, 0.78))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
          borderRadius: "18px",
          padding: "16px 18px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            🕒
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
              Business Hours (Addis Ababa)
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--tg-theme-hint-color, #8fa0b5)", marginTop: "2px" }}>
              {SUPPORT_CONFIG.workingDays}: {SUPPORT_CONFIG.workingHours}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: "11.5px",
            color: officeStatus.isOpen ? "#30d158" : "#fbbf24",
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          {officeStatus.detail}
        </span>
      </div>

      {/* ── Action Buttons: Telegram + Call + Copy ───────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {/* 1. Chat on Telegram Button */}
        <button
          type="button"
          onClick={handleTelegramClick}
          className="btn"
          style={{
            width: "100%",
            minHeight: "50px",
            background: "linear-gradient(135deg, #0088cc 0%, #0077b5 100%)",
            color: "#ffffff",
            borderRadius: "16px",
            fontSize: "15px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            border: "none",
            boxShadow: "0 4px 16px rgba(0, 136, 204, 0.35)",
            cursor: "pointer",
            transition: "transform 0.12s ease",
          }}
        >
          {/* Telegram Paper Plane SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
          </svg>
          <span>Chat on Telegram ({telegramDisplay})</span>
        </button>

        {/* 2. Call & Copy Number Row */}
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href={`tel:${SUPPORT_CONFIG.phoneNumber}`}
            className="btn"
            style={{
              flex: 1.4,
              minHeight: "48px",
              background: "rgba(48, 209, 88, 0.15)",
              color: "#30d158",
              border: "1px solid rgba(48, 209, 88, 0.35)",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Call Us ({SUPPORT_CONFIG.phoneDisplay})</span>
          </a>

          <button
            type="button"
            onClick={handleCopyNumber}
            className="btn btn-secondary"
            style={{
              flex: 1,
              minHeight: "48px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              fontSize: "13.5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            {copied ? (
              <>
                <span style={{ color: "#30d158" }}>✓</span>
                <span style={{ color: "#30d158" }}>Copied!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Number</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <span style={{ width: "3.5px", height: "18px", borderRadius: "3px", background: "#38bdf8", display: "inline-block" }} />
          <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--tg-theme-text-color, #ffffff)", margin: 0 }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaq === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: "var(--glass-bg, rgba(10, 18, 36, 0.78))",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: `1px solid ${isOpen ? "rgba(56, 189, 248, 0.35)" : "var(--glass-border, rgba(255, 255, 255, 0.08))"}`,
                  borderRadius: "16px",
                  overflow: "hidden",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: isOpen ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  style={{
                    width: "100%",
                    padding: "15px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "14.5px",
                    fontWeight: 700,
                  }}
                  aria-expanded={isOpen}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{item.icon}</span>
                    <span>{item.question}</span>
                  </div>
                  <span
                    style={{
                      fontSize: "18px",
                      color: isOpen ? "#38bdf8" : "#8fa0b5",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      display: "inline-block",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 18px 16px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      marginTop: "4px",
                      paddingTop: "12px",
                    }}
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
