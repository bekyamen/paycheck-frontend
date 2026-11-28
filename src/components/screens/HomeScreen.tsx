"use client";
import React from "react";
import type { UserProfile } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import { CbeLogo, TelebirrLogo } from "@/components/ui/BankLogos";

interface HomeScreenProps {
  user: UserProfile;
  onNavigate: (tab: "verify" | "accounts" | "cashiers" | "profile") => void;
  onQuickScan?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "GOOD MORNING,";
  if (hour >= 12 && hour < 17) return "GOOD AFTERNOON,";
  return "GOOD EVENING,";
}

export default function HomeScreen({ user, onNavigate, onQuickScan }: HomeScreenProps) {
  const firstName = user.fullName ? user.fullName.split(" ")[0] : "Bereket";
  const accountsCount = user.accountsCount ?? 2;
  const cashiersCount = user.cashiersCount ?? 1;

  const handleAction = (tab: "verify" | "accounts" | "cashiers" | "profile") => {
    haptic("selection");
    onNavigate(tab);
  };

  const handleQuickScan = () => {
    haptic("medium");
    if (onQuickScan) {
      onQuickScan();
    } else {
      onNavigate("verify");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 15% 0%, rgba(14, 55, 138, 0.4) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.3) 0%, transparent 45%), #050b18",
        color: "#ffffff",
        padding: "16px 16px 100px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              color: "#7b93b2",
              textTransform: "uppercase",
              marginBottom: "3px",
            }}
          >
            {getGreeting()}
          </p>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.3px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {firstName} <span style={{ fontSize: "24px" }}>👋</span>
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "#8fa2bd",
              margin: "6px 0 0",
              lineHeight: 1.35,
            }}
          >
            Verify payments, build trust,<br />
            keep your business moving.
          </p>
        </div>

        {/* Business Dashboard Pill Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "9999px",
            background: "rgba(14, 165, 233, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.28)",
            color: "#38bdf8",
            fontSize: "11.5px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Classical bank / building icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
          </svg>
          <span>{user.organizationName || "Business Dashboard"}</span>
        </div>
      </div>

      {/* ── Quick Stats Top Card ───────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(14, 45, 114, 0.6) 0%, rgba(8, 23, 64, 0.8) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "20px",
          padding: "16px 18px",
          marginBottom: "16px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Total Accounts */}
        <div
          onClick={() => handleAction("accounts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.35)",
              flexShrink: 0,
            }}
          >
            {/* Wallet / Credit card icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="3" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: 500, display: "block" }}>
              Total Accounts
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
                {accountsCount}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "16px", fontWeight: 600 }}>›</span>
            </div>
          </div>
        </div>

        {/* Active Cashiers */}
        <div
          onClick={() => handleAction("cashiers")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
              flexShrink: 0,
            }}
          >
            {/* Cash register / cashier badge icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: 500, display: "block" }}>
              Active Cashiers
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
                {cashiersCount}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "16px", fontWeight: 600 }}>›</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Highlight Action Cards (2-column Grid) ──────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: Verify Payment (Vibrant Green) */}
        <div
          onClick={() => handleAction("verify")}
          style={{
            background: "linear-gradient(145deg, #057a55 0%, #046c4e 50%, #03543f 100%)",
            border: "1px solid rgba(52, 211, 153, 0.32)",
            borderRadius: "20px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "148px",
            cursor: "pointer",
            boxShadow: "0 10px 25px -5px rgba(5, 122, 85, 0.45)",
            transition: "transform 0.15s ease",
            userSelect: "none",
          }}
        >
          {/* Circular badge */}
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>

          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
                margin: "12px 0 0",
                lineHeight: 1.2,
              }}
            >
              Verify Payment
            </h3>
            <p
              style={{
                fontSize: "11.5px",
                color: "rgba(255, 255, 255, 0.82)",
                margin: "4px 0 0",
                lineHeight: 1.35,
              }}
            >
              Check CBE or Telebirr customer payment receipts
            </p>
          </div>

          {/* Bottom right arrow button */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              alignSelf: "flex-end",
              marginTop: "8px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Card 2: Quick Scan (Royal Sapphire Blue) */}
        <div
          onClick={handleQuickScan}
          style={{
            background: "linear-gradient(145deg, #1d4ed8 0%, #1e40af 50%, #172554 100%)",
            border: "1px solid rgba(96, 165, 250, 0.32)",
            borderRadius: "20px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "148px",
            cursor: "pointer",
            boxShadow: "0 10px 25px -5px rgba(29, 78, 216, 0.45)",
            transition: "transform 0.15s ease",
            userSelect: "none",
          }}
        >
          {/* Circular badge */}
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1.5" />
            </svg>
          </div>

          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
                margin: "12px 0 0",
                lineHeight: 1.2,
              }}
            >
              Quick Scan
            </h3>
            <p
              style={{
                fontSize: "11.5px",
                color: "rgba(255, 255, 255, 0.82)",
                margin: "4px 0 0",
                lineHeight: 1.35,
              }}
            >
              Scan & verify receipt instantly
            </p>
          </div>

          {/* Bottom right arrow button */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              alignSelf: "flex-end",
              marginTop: "8px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Main Menu Section ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: "16px" }}>
        {/* Section Title Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "3.5px",
                height: "18px",
                borderRadius: "3px",
                background: "#00d2ff",
                display: "inline-block",
              }}
            />
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
              Main Menu
            </h2>
          </div>
          <button
            type="button"
            onClick={() => handleAction("verify")}
            style={{
              background: "none",
              border: "none",
              color: "#38bdf8",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            All Features →
          </button>
        </div>

        {/* 4 Stacked Menu Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* 1. Verify Payment */}
          <div
            onClick={() => handleAction("verify")}
            style={{
              background: "rgba(10, 18, 36, 0.78)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "3.5px solid #eab308",
              borderRadius: "18px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(234, 179, 8, 0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ fontSize: "15.5px", fontWeight: 700, color: "#ffffff", display: "block" }}>
                  Verify Payment
                </strong>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <CbeLogo size={14} />
                  <TelebirrLogo size={14} />
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#8fa2bd", margin: "3px 0 0", lineHeight: 1.3 }}>
                Check CBE or Telebirr customer payment receipts
              </p>
            </div>
            <span style={{ fontSize: "20px", color: "#64748b", fontWeight: 600 }}>›</span>
          </div>

          {/* 2. Receiving Accounts */}
          <div
            onClick={() => handleAction("accounts")}
            style={{
              background: "rgba(10, 18, 36, 0.78)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "3.5px solid #3b82f6",
              borderRadius: "18px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ fontSize: "15.5px", fontWeight: 700, color: "#ffffff", display: "block" }}>
                  Receiving Accounts
                </strong>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <CbeLogo size={14} />
                  <TelebirrLogo size={14} />
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#8fa2bd", margin: "3px 0 0", lineHeight: 1.3 }}>
                Manage CBE Bank accounts & Telebirr numbers
              </p>
            </div>
            <span style={{ fontSize: "20px", color: "#64748b", fontWeight: 600 }}>›</span>
          </div>

          {/* 3. Cashiers */}
          <div
            onClick={() => handleAction("cashiers")}
            style={{
              background: "rgba(10, 18, 36, 0.78)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "3.5px solid #10b981",
              borderRadius: "18px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "15.5px", fontWeight: 700, color: "#ffffff", display: "block" }}>
                Cashiers
              </strong>
              <p style={{ fontSize: "12px", color: "#8fa2bd", margin: "3px 0 0", lineHeight: 1.3 }}>
                Add staff cashiers, reset passwords & permissions
              </p>
            </div>
            <span style={{ fontSize: "20px", color: "#64748b", fontWeight: 600 }}>›</span>
          </div>

          {/* 4. Profile & Settings */}
          <div
            onClick={() => handleAction("profile")}
            style={{
              background: "rgba(10, 18, 36, 0.78)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "3.5px solid #a855f7",
              borderRadius: "18px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "15.5px", fontWeight: 700, color: "#ffffff", display: "block" }}>
                Profile & Settings
              </strong>
              <p style={{ fontSize: "12px", color: "#8fa2bd", margin: "3px 0 0", lineHeight: 1.3 }}>
                Branch info, phone number and sign out
              </p>
            </div>
            <span style={{ fontSize: "20px", color: "#64748b", fontWeight: 600 }}>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
