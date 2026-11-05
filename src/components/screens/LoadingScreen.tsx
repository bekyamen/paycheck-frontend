"use client";

export default function LoadingScreen() {
  return (
    <div
      className="screen"
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        background: "var(--tg-theme-bg-color)",
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "24px",
          background: "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "40px",
          boxShadow: "0 8px 32px rgba(10, 132, 255, 0.35)",
          animation: "scaleIn 0.4s ease",
        }}
      >
        🏦
      </div>

      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease 0.2s both" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>
          CF Verification
        </h1>
        <p style={{ color: "var(--tg-theme-hint-color)", fontSize: "14px" }}>
          Connecting securely…
        </p>
      </div>

      <div className="spinner" style={{ animation: "spin 0.8s linear infinite, fadeIn 0.5s ease 0.4s both" }} />
    </div>
  );
}
