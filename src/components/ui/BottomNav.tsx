"use client";
import { haptic } from "@/lib/telegram";

export type NavTab = "home" | "verify" | "accounts" | "cashiers" | "profile";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  isAdmin?: boolean;
}

const ADMIN_TABS: { id: NavTab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "verify", icon: "⚡", label: "Verify" },
  { id: "accounts", icon: "🏦", label: "Accounts" },
  { id: "cashiers", icon: "👥", label: "Cashiers" },
  { id: "profile", icon: "👤", label: "Profile" },
];

const CASHIER_TABS: { id: NavTab; icon: string; label: string }[] = [
  { id: "verify", icon: "⚡", label: "Verify" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export default function BottomNav({ active, onChange, isAdmin = true }: BottomNavProps) {
  const tabs = isAdmin ? ADMIN_TABS : CASHIER_TABS;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            type="button"
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => {
              haptic("selection");
              onChange(tab.id);
            }}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon" style={{ fontSize: "20px" }}>{tab.icon}</span>
            <span
              className="nav-label"
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--tg-theme-button-color, #0a84ff)" : "var(--tg-theme-hint-color, #8e8e93)",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
