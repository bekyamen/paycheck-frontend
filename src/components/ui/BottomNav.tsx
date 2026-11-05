"use client";
import { haptic } from "@/lib/telegram";

export type NavTab = "accounts" | "profile";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; icon: string; label: string }[] = [
  { id: "accounts", icon: "🏦", label: "Accounts" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          className={`nav-item ${active === tab.id ? "active" : ""}`}
          onClick={() => {
            haptic("selection");
            onChange(tab.id);
          }}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
