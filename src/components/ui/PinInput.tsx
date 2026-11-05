"use client";
import { useRef, useEffect } from "react";

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  label?: string;
  error?: string;
  autoFocus?: boolean;
}

export default function PinInput({
  value,
  onChange,
  length = 4,
  label,
  error,
  autoFocus = false,
}: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const digits = value.split("");
  const filled = digits.length;

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="pin-row" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < filled ? "filled" : ""} ${i === filled ? "focused" : ""}`}
          >
            {digits[i] ? "•" : ""}
            {/* hidden cursor line for the active slot */}
            {i === filled && (
              <span
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "18px",
                  height: "2px",
                  background: "var(--tg-theme-button-color)",
                  animation: "pulse 1s ease infinite",
                  borderRadius: "1px",
                }}
              />
            )}
          </div>
        ))}
        <input
          ref={inputRef}
          id="pin-hidden"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(v);
          }}
          className="pin-hidden-input"
          autoComplete="one-time-code"
        />
      </div>
      {error && (
        <span style={{ color: "var(--tg-theme-destructive-text-color)", fontSize: "13px" }}>
          {error}
        </span>
      )}
    </div>
  );
}
