"use client";
import { useState, useEffect, useCallback } from "react";
import type { BankAccount, UserProfile } from "@/lib/api";
import { getAccounts, addAccount } from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface SettingsScreenProps {
  user: UserProfile;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

// Only the two banks requested for this feature
const BANKS = [
  { value: "CBE", label: "CBE (Commercial Bank of Ethiopia)", icon: "🏦", placeholder: "1000123456789" },
  { value: "TELEBIRR", label: "Telebirr", icon: "📱", placeholder: "0912345678" },
];

const bankMeta = (value: string) =>
  BANKS.find((b) => b.value === value) ?? { value, label: value, icon: "🏦", placeholder: "" };

function GroupHeader({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "10px",
        padding: "0 4px",
      }}
    >
      <span style={{ fontSize: "20px" }}>{icon}</span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--tg-theme-section-header-text-color)",
          flex: 1,
        }}
      >
        {label}
      </span>
      <span
        className="badge"
        style={{ background: "rgba(10,132,255,0.12)", color: "var(--tg-theme-link-color)" }}
      >
        {count}
      </span>
    </div>
  );
}

function ReceivingAccountItem({ account }: { account: BankAccount }) {
  const meta = bankMeta(account.bankName);
  const formatted = account.accountNumber.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div
      className="account-card"
      style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "14px" }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background:
            account.bankName === "TELEBIRR"
              ? "linear-gradient(135deg, #00b09b, #96c93d)"
              : "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--tg-theme-hint-color)",
            marginBottom: "2px",
          }}
        >
          {account.bankName === "TELEBIRR" ? "Telebirr Wallet" : "CBE Account"}
        </p>
        <p
          style={{
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: "15px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatted}
        </p>
        <p style={{ fontSize: "13px", color: "var(--tg-theme-subtitle-text-color)", marginTop: "2px" }}>
          {account.accountHolderName}
        </p>
      </div>

      <span className={`badge ${account.isActive ? "badge-success" : "badge-inactive"}`}>
        {account.isActive ? "Active" : "Off"}
      </span>
    </div>
  );
}

export default function SettingsScreen({ user, showToast }: SettingsScreenProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);

  // Add form state
  const [bank, setBank] = useState("CBE");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const canManage = ["OWNER", "MANAGER", "ADMIN"].includes(user.role);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch {
      showToast("Could not load receiving accounts", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function openSheet() {
    haptic("light");
    setBank("CBE");
    setAccountNumber("");
    setHolderName("");
    setFormError("");
    setShowSheet(true);
  }

  function closeSheet() {
    setShowSheet(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    // Validate
    if (!accountNumber.trim()) {
      setFormError("Account number is required.");
      return;
    }
    if (bank === "TELEBIRR" && !/^0[79]\d{8}$/.test(accountNumber.trim())) {
      setFormError("Enter a valid Telebirr phone number (e.g. 0912345678).");
      return;
    }
    if (bank === "CBE" && accountNumber.trim().length < 10) {
      setFormError("Enter a valid CBE account number (at least 10 digits).");
      return;
    }
    if (!holderName.trim()) {
      setFormError("Account holder name is required.");
      return;
    }

    setSaving(true);
    try {
      const created = await addAccount({
        bankName: bank,
        accountNumber: accountNumber.trim(),
        accountHolderName: holderName.trim(),
      });
      haptic("success");
      setAccounts((prev) => [...prev, created.account]);
      closeSheet();
      showToast("Receiving account added ✓", "success");
    } catch (err: unknown) {
      haptic("error");
      const msg = (err as Error).message;
      if (msg.includes("already") || msg.includes("exist")) {
        setFormError("This account number is already registered.");
      } else if (msg.includes("401") || msg.includes("Unauthorized")) {
        setFormError("You are not authorised to add accounts.");
      } else {
        setFormError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Group accounts by bank
  const grouped = accounts.reduce<Record<string, BankAccount[]>>((acc, a) => {
    (acc[a.bankName] ??= []).push(a);
    return acc;
  }, {});

  const selectedBankMeta = bankMeta(bank);

  return (
    <>
      <div className="screen">
        {/* Header */}
        <div className="screen-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 className="screen-title">Settings</h1>
              <p className="text-muted text-sm" style={{ marginTop: "2px" }}>
                Receiving accounts
              </p>
            </div>
            {canManage && (
              <button
                className="btn btn-primary"
                style={{ width: "auto", padding: "9px 16px", fontSize: "13px", gap: "6px" }}
                onClick={openSheet}
              >
                <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
                Add Account
              </button>
            )}
          </div>
        </div>

        <div className="screen-content">
          {/* Info banner */}
          <div
            style={{
              background: "rgba(10,132,255,0.08)",
              border: "1px solid rgba(10,132,255,0.2)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1.3 }}>ℹ️</span>
            <p style={{ fontSize: "13px", color: "var(--tg-theme-hint-color)", lineHeight: 1.5 }}>
              These are the accounts your customers send payments to. Add your CBE bank account or
              Telebirr wallet here.
            </p>
          </div>

          {/* Account list */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "48px" }}>
              <div className="spinner" />
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: "64px" }}>
              <p style={{ fontSize: "48px", marginBottom: "12px" }}>💳</p>
              <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>
                No receiving accounts yet
              </p>
              {canManage ? (
                <p className="text-muted text-sm">
                  Tap <strong>+ Add Account</strong> to register your first bank account or Telebirr
                  wallet.
                </p>
              ) : (
                <p className="text-muted text-sm">
                  Ask your manager to add a receiving account.
                </p>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([bankName, accs]) => {
              const meta = bankMeta(bankName);
              return (
                <div key={bankName} style={{ marginBottom: "24px" }}>
                  <GroupHeader icon={meta.icon} label={meta.label} count={accs.length} />
                  {accs.map((acc) => (
                    <ReceivingAccountItem key={acc.id} account={acc} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Account Bottom Sheet */}
      {showSheet && (
        <>
          <div className="overlay" onClick={closeSheet} />
          <div className="sheet" role="dialog" aria-labelledby="settings-sheet-title">
            <div className="sheet-handle" />
            <h3
              id="settings-sheet-title"
              style={{ fontWeight: 800, fontSize: "18px", marginBottom: "4px" }}
            >
              Add Receiving Account
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: "20px" }}>
              Customers will send payments to this account.
            </p>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Bank selector */}
              <div className="form-group">
                <label className="form-label" htmlFor="settings-bank">
                  Bank / Wallet
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {BANKS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => {
                        haptic("selection");
                        setBank(b.value);
                        setAccountNumber("");
                        setFormError("");
                      }}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        borderRadius: "var(--radius-md)",
                        border: `2px solid ${
                          bank === b.value
                            ? "var(--tg-theme-button-color)"
                            : "var(--glass-border)"
                        }`,
                        background:
                          bank === b.value
                            ? "rgba(10,132,255,0.1)"
                            : "var(--tg-theme-secondary-bg-color)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 150ms ease",
                      }}
                    >
                      <span style={{ fontSize: "22px" }}>{b.icon}</span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color:
                            bank === b.value
                              ? "var(--tg-theme-button-color)"
                              : "var(--tg-theme-text-color)",
                        }}
                      >
                        {b.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account number */}
              <div className="form-group">
                <label className="form-label" htmlFor="settings-acct-num">
                  {bank === "TELEBIRR" ? "Phone Number" : "Account Number"}
                </label>
                <input
                  id="settings-acct-num"
                  className={`form-input ${formError && !holderName ? "error" : ""}`}
                  type="text"
                  inputMode="numeric"
                  placeholder={selectedBankMeta.placeholder}
                  value={accountNumber}
                  onChange={(e) => {
                    setFormError("");
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                  }}
                  disabled={saving}
                  autoComplete="off"
                />
                {bank === "TELEBIRR" && (
                  <span className="text-muted text-xs" style={{ marginTop: "2px" }}>
                    Enter the 10-digit Telebirr phone number
                  </span>
                )}
              </div>

              {/* Holder name */}
              <div className="form-group">
                <label className="form-label" htmlFor="settings-holder">
                  Account Holder Name
                </label>
                <input
                  id="settings-holder"
                  className="form-input"
                  type="text"
                  placeholder="Full name as registered"
                  value={holderName}
                  onChange={(e) => {
                    setFormError("");
                    setHolderName(e.target.value);
                  }}
                  disabled={saving}
                  autoComplete="name"
                />
              </div>

              {/* Inline error */}
              {formError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,69,58,0.1)",
                    border: "1px solid rgba(255,69,58,0.3)",
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "var(--tg-theme-destructive-text-color)", fontWeight: 700 }}>
                    ✕
                  </span>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--tg-theme-destructive-text-color)",
                      lineHeight: 1.4,
                    }}
                  >
                    {formError}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={closeSheet}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${saving ? "btn-loading" : ""}`}
                  style={{ flex: 2 }}
                  disabled={saving}
                >
                  {saving ? "" : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
