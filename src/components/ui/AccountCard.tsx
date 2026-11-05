"use client";
import { BankAccount } from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface AccountCardProps {
  account: BankAccount;
  isManager: boolean;
  onToggle: (account: BankAccount) => void;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export default function AccountCard({
  account,
  isManager,
  onToggle,
  onEdit,
  onDelete,
}: AccountCardProps) {
  const { id, bankName, accountNumber, accountHolderName, isActive } = account;

  // Format account number with spaces every 4 chars
  const formatted = accountNumber.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div
      className={`account-card ${!isActive ? "inactive" : ""}`}
      style={{ marginBottom: "10px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="bank-name">{bankName}</p>
          <p className="account-number">{formatted}</p>
          <p className="holder-name">{accountHolderName}</p>
        </div>
        <span className={`badge ${isActive ? "badge-success" : "badge-inactive"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {isManager && (
        <div className="action-row" style={{ marginTop: "12px" }}>
          <button
            className={`action-btn toggle-btn ${isActive ? "active-btn" : "inactive-btn"}`}
            onClick={() => {
              haptic("light");
              onToggle(account);
            }}
            aria-label={isActive ? "Deactivate account" : "Activate account"}
          >
            <span className="action-icon">{isActive ? "✓" : "○"}</span>
            <span className="action-label">{isActive ? "Active" : "Inactive"}</span>
          </button>

          <button
            className="action-btn edit-btn"
            onClick={() => {
              haptic("light");
              onEdit(account);
            }}
            aria-label="Edit account"
          >
            <span className="action-icon">✎</span>
            <span className="action-label">Edit</span>
          </button>

          <button
            className="action-btn delete-btn"
            onClick={() => {
              haptic("medium");
              onDelete(account);
            }}
            aria-label="Delete account"
          >
            <span className="action-icon">✕</span>
            <span className="action-label">Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
