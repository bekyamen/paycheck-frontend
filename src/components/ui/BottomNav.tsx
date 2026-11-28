"use client";
import React from "react";
import { haptic } from "@/lib/telegram";

export type NavTab = "home" | "verify" | "accounts" | "cashiers" | "support" | "profile";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  isAdmin?: boolean;
}

interface TabDef {
  id: NavTab;
  label: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
}

const ALL_TABS: TabDef[] = [
  {
    id: "home",
    label: "Home",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "#38bdf8" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" fill={active ? "#040816" : "none"} />
      </svg>
    ),
  },
  {
    id: "verify",
    label: "Verify",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "#38bdf8" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "accounts",
    label: "Accounts",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "rgba(56, 189, 248, 0.2)" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
      </svg>
    ),
  },
  {
    id: "cashiers",
    label: "Cashiers",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "rgba(56, 189, 248, 0.2)" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "support",
    label: "Support",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "rgba(56, 189, 248, 0.2)" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    renderIcon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "rgba(56, 189, 248, 0.2)" : "none"}
        stroke={active ? "#38bdf8" : "#64748b"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange, isAdmin = true }: BottomNavProps) {
  const tabs = isAdmin
    ? ALL_TABS
    : ALL_TABS.filter((t) => t.id === "verify" || t.id === "support" || t.id === "profile");

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        background: "rgba(4, 8, 22, 0.95)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-around",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            type="button"
            onClick={() => {
              haptic("selection");
              onChange(tab.id);
            }}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 0",
              position: "relative",
              transition: "transform 0.12s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tab.renderIcon(isActive)}
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#38bdf8" : "#64748b",
                letterSpacing: "0.2px",
              }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: "4px",
                  width: "24px",
                  height: "2.5px",
                  borderRadius: "2px",
                  background: "#38bdf8",
                  boxShadow: "0 0 8px rgba(56, 189, 248, 0.6)",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
