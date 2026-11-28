"use client";

import React from "react";
import Link from "next/link";
import SupportContent from "@/components/ui/SupportContent";
import { useToast, ToastContainer } from "@/components/ui/Toast";

export default function StandaloneSupportPage() {
  const { toasts, show: showToast, remove: removeToast } = useToast();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 15% 0%, rgba(14, 55, 138, 0.4) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.3) 0%, transparent 45%), #050b18",
        color: "#ffffff",
        padding: "16px 16px 60px",
      }}
    >
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top Navbar for Standalone Web App View */}
      <header
        style={{
          maxWidth: "680px",
          margin: "0 auto 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Link
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "16px",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "20px" }}>🛡️</span>
          <span>Paycheck Verification</span>
        </Link>

        <Link
          href="/app"
          className="btn btn-secondary"
          style={{
            padding: "8px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
            color: "#38bdf8",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}
        >
          Go to App →
        </Link>
      </header>

      <SupportContent
        isStandalonePage={true}
        showToast={showToast}
      />
    </div>
  );
}
