"use client";
import type { UserProfile } from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface HomeScreenProps {
  user: UserProfile;
  onNavigate: (tab: "verify" | "accounts" | "cashiers" | "profile") => void;
}

export default function HomeScreen({ user, onNavigate }: HomeScreenProps) {
  return (
    <div className="screen">
      <div className="screen-header" style={{ paddingBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="text-muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {user.organizationName || "Business Dashboard"}
            </p>
            <h1 className="screen-title" style={{ fontSize: "24px", marginTop: "2px" }}>
              Welcome, {user.fullName.split(" ")[0]} 👋
            </h1>
          </div>
          <span
            className="badge"
            style={{
              background: "rgba(10, 132, 255, 0.15)",
              color: "var(--tg-theme-link-color, #0a84ff)",
              padding: "4px 10px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            {user.role}
          </span>
        </div>
      </div>

      <div className="screen-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Quick summary card */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(10, 132, 255, 0.18) 0%, rgba(94, 92, 230, 0.18) 100%)",
            border: "1px solid rgba(10, 132, 255, 0.3)",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div style={{ cursor: "pointer" }} onClick={() => onNavigate("accounts")}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--tg-theme-button-color, #0a84ff)" }}>
                {user.accountsCount ?? "—"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #8e8e93)", marginTop: "2px" }}>
                Receiving Accounts
              </div>
            </div>
            <div style={{ width: "1px", background: "var(--glass-border)" }} />
            <div style={{ cursor: "pointer" }} onClick={() => onNavigate("cashiers")}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#30d158" }}>
                {user.cashiersCount ?? "—"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #8e8e93)", marginTop: "2px" }}>
                Active Cashiers
              </div>
            </div>
          </div>
        </div>

        {/* 4 Main Action Buttons */}
        <p className="section-label" style={{ margin: "4px 0 0" }}>Main Menu</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          {/* 1. Verify Payment */}
          <button
            type="button"
            className="card"
            onClick={() => {
              haptic("selection");
              onNavigate("verify");
            }}
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              textAlign: "left",
              border: "1px solid rgba(255, 214, 10, 0.25)",
              background: "linear-gradient(135deg, rgba(255, 214, 10, 0.1) 0%, rgba(255, 159, 10, 0.05) 100%)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(255, 214, 10, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "17px", display: "block", color: "#ffd60a" }}>Verify Payment</strong>
              <span className="text-muted text-xs" style={{ marginTop: "2px", display: "block" }}>
                Check CBE or Telebirr customer payment receipts
              </span>
            </div>
            <span style={{ fontSize: "20px", color: "var(--tg-theme-hint-color)" }}>›</span>
          </button>

          {/* 2. Receiving Accounts */}
          <button
            type="button"
            className="card"
            onClick={() => {
              haptic("selection");
              onNavigate("accounts");
            }}
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(10, 132, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              🏦
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "17px", display: "block" }}>Receiving Accounts</strong>
              <span className="text-muted text-xs" style={{ marginTop: "2px", display: "block" }}>
                Manage CBE bank accounts & Telebirr numbers
              </span>
            </div>
            <span style={{ fontSize: "20px", color: "var(--tg-theme-hint-color)" }}>›</span>
          </button>

          {/* 3. Cashiers */}
          <button
            type="button"
            className="card"
            onClick={() => {
              haptic("selection");
              onNavigate("cashiers");
            }}
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(48, 209, 88, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              👥
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "17px", display: "block" }}>Cashiers</strong>
              <span className="text-muted text-xs" style={{ marginTop: "2px", display: "block" }}>
                Add staff cashiers, reset passwords & permissions
              </span>
            </div>
            <span style={{ fontSize: "20px", color: "var(--tg-theme-hint-color)" }}>›</span>
          </button>

          {/* 4. Profile */}
          <button
            type="button"
            className="card"
            onClick={() => {
              haptic("selection");
              onNavigate("profile");
            }}
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(142, 142, 147, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              👤
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "17px", display: "block" }}>Profile & Settings</strong>
              <span className="text-muted text-xs" style={{ marginTop: "2px", display: "block" }}>
                Branch info, phone number and sign out
              </span>
            </div>
            <span style={{ fontSize: "20px", color: "var(--tg-theme-hint-color)" }}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
