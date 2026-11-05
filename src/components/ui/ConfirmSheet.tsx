"use client";
import { haptic } from "@/lib/telegram";

interface ConfirmSheetProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmSheet({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <>
      <div className="overlay" onClick={onCancel} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-handle" />
        <h3
          id="sheet-title"
          style={{
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: "8px",
            color: danger ? "var(--tg-theme-destructive-text-color)" : "var(--tg-theme-text-color)",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: "14px", color: "var(--tg-theme-hint-color)", marginBottom: "24px" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => {
              haptic("light");
              onCancel();
            }}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            style={{ flex: 1 }}
            onClick={() => {
              haptic(danger ? "error" : "success");
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
