import React from "react";

interface LogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  badge?: boolean;
}

/**
 * Official Commercial Bank of Ethiopia (CBE) Brand Logo
 * Uses the user-provided official CBE gold spiral medallion emblem.
 */
export function CbeLogo({ size = 24, className, style, badge = false }: LogoProps) {
  const dim = typeof size === "number" ? `${size}px` : size;
  const img = (
    <img
      src="/images/cbe-logo.png"
      alt="Commercial Bank of Ethiopia (CBE)"
      className={className}
      style={{
        width: dim,
        height: dim,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes("original")) {
          target.src = "/images/cbe-logo-original.png";
        }
      }}
    />
  );

  if (badge) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "3px",
        }}
      >
        {img}
      </span>
    );
  }

  return img;
}

/**
 * Official Telebirr Brand Logo
 * Uses the user-provided official Ethio Telecom / Telebirr blue emblem.
 */
export function TelebirrLogo({ size = 24, className, style, badge = false }: LogoProps) {
  const dim = typeof size === "number" ? `${size}px` : size;
  const img = (
    <img
      src="/images/telebirr-logo.png"
      alt="Telebirr"
      className={className}
      style={{
        width: dim,
        height: dim,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes("original")) {
          target.src = "/images/telebirr-logo-original.jpg";
        }
      }}
    />
  );

  if (badge) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "3px",
        }}
      >
        {img}
      </span>
    );
  }

  return img;
}

/**
 * Universal Bank Logo switcher component
 */
export function BankLogo({
  bank,
  size = 24,
  className,
  style,
  badge = false,
}: {
  bank: string | null | undefined;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  badge?: boolean;
}) {
  const upper = String(bank || "").trim().toUpperCase();
  if (upper === "TELEBIRR" || upper === "TELE_BIRR") {
    return <TelebirrLogo size={size} className={className} style={style} badge={badge} />;
  }
  if (upper === "CBE" || upper === "CBE_BIRR" || upper === "CBEBIRR") {
    return <CbeLogo size={size} className={className} style={style} badge={badge} />;
  }

  // Fallback generic bank icon
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-label={bank || "Bank"}
    >
      <path d="M3 10h18M5 10v8M10 10v8M14 10v8M19 10v8M2 20h20M12 3l10 5H2l10-5z" />
    </svg>
  );
}
