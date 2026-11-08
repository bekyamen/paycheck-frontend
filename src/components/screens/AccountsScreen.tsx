"use client";
import { useState, useEffect, useCallback } from "react";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import type { BankAccount, UserProfile } from "@/lib/api";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  toggleAccount,
} from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface AccountsScreenProps {
  user: UserProfile;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const BANKS = [
  { value: "CBE", label: "Commercial Bank of Ethiopia (CBE)", icon: "🏦" },
  { value: "TELEBIRR", label: "Telebirr", icon: "📱" },
];

type ModalState =
  | { type: "delete"; account: BankAccount }
  | { type: "edit"; account: BankAccount }
  | null;

export default function AccountsScreen({ user, showToast }: AccountsScreenProps) {
  const [groupedAccounts, setGroupedAccounts] = useState<{ CBE: BankAccount[]; TELEBIRR: BankAccount[]; [k: string]: BankAccount[] }>({
    CBE: [],
    TELEBIRR: [],
  });
  const [allAccounts, setAllAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add account form
  const [addBank, setAddBank] = useState("CBE");
  const [addNumber, setAddNumber] = useState("");
  const [addHolder, setAddHolder] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit account form
  const [editHolder, setEditHolder] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const isAdmin = user.isAdmin ?? (user.role === "OWNER" || user.role === "MANAGER" || user.role === "ADMIN");

  const fetchAccounts = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAccounts();
      setAllAccounts(data.accounts);
      setGroupedAccounts({
        CBE: data.grouped.CBE || [],
        TELEBIRR: data.grouped.TELEBIRR || [],
      });
    } catch (err: any) {
      showToast(err.message || "Failed to load receiving accounts", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // If cashier tries to view admin screen
  if (!isAdmin) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h1 className="screen-title">Receiving Accounts</h1>
        </div>
        <div className="screen-content" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Admins Only</h2>
          <p className="text-muted text-sm">
            This section is for business admins only. Cashiers cannot view or modify receiving accounts.
          </p>
        </div>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addNumber.trim() || !addHolder.trim()) {
      showToast("Please enter both the account number and holder name", "error");
      return;
    }

    setAddLoading(true);
    try {
      const res = await addAccount({
        bankName: addBank,
        accountNumber: addNumber.trim(),
        accountHolderName: addHolder.trim(),
      });
      haptic("success");
      showToast(res.message || "Receiving account added successfully! ✓", "success");
      setAddNumber("");
      setAddHolder("");
      setShowAdd(false);
      await fetchAccounts();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to add receiving account", "error");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleToggle(account: BankAccount) {
    const nextState = !account.isActive;
    try {
      const res = await toggleAccount(account.id, nextState);
      haptic("light");
      showToast(res.message || (nextState ? "Account enabled ✓" : "Account disabled ✓"), "success");
      await fetchAccounts();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to update account status", "error");
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.type !== "edit") return;
    if (!editHolder.trim() || editHolder.trim().length < 2) {
      showToast("Account holder name must be at least 2 characters", "error");
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateAccount(modal.account.id, editHolder.trim());
      haptic("success");
      showToast(res.message || "Account holder name updated ✓", "success");
      setModal(null);
      await fetchAccounts();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to update account", "error");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (modal?.type !== "delete") return;
    try {
      const res = await deleteAccount(modal.account.id);
      haptic("success");
      showToast(res.message || "Account deleted successfully ✓", "success");
      setModal(null);
      await fetchAccounts();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to delete account", "error");
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="screen-title">Receiving Accounts</h1>
            <p className="text-muted text-xs" style={{ marginTop: "2px" }}>
              Accounts where you receive payment
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              haptic("light");
              setShowAdd(!showAdd);
            }}
            style={{ padding: "8px 14px", fontSize: "13px" }}
          >
            {showAdd ? "Cancel" : "+ Add Account"}
          </button>
        </div>
      </div>

      <div className="screen-content" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ── ADD NEW ACCOUNT DRAWER / FORM ── */}
        {showAdd && (
          <form onSubmit={handleAdd} className="card" style={{ padding: "18px", border: "1px solid var(--tg-theme-button-color, #0a84ff)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
              Add Receiving Account
            </h3>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label">Bank or Payment Provider</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {BANKS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setAddBank(b.value)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      border: addBank === b.value ? "2px solid var(--tg-theme-button-color, #0a84ff)" : "1px solid var(--glass-border)",
                      background: addBank === b.value ? "rgba(10, 132, 255, 0.15)" : "transparent",
                      color: addBank === b.value ? "var(--tg-theme-button-color, #0a84ff)" : "inherit",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {b.icon} {b.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label" htmlFor="add-account-number">
                {addBank === "CBE" ? "13-Digit Account Number" : "Telebirr Mobile Phone Number"}
              </label>
              <input
                id="add-account-number"
                className="form-input"
                type="text"
                placeholder={addBank === "CBE" ? "1000123456789" : "0912345678"}
                value={addNumber}
                onChange={(e) => setAddNumber(e.target.value)}
                disabled={addLoading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="add-holder-name">Account Holder Name</label>
              <input
                id="add-holder-name"
                className="form-input"
                type="text"
                placeholder="Full name as shown in bank/Telebirr"
                value={addHolder}
                onChange={(e) => setAddHolder(e.target.value)}
                disabled={addLoading}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${addLoading ? "btn-loading" : ""}`}
              disabled={addLoading}
              style={{ width: "100%" }}
            >
              {addLoading ? "" : "Save Receiving Account"}
            </button>
          </form>
        )}

        {/* ── ACCOUNTS LIST GROUPED BY BANK ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }} className="text-muted text-sm">
            Loading receiving accounts...
          </div>
        ) : allAccounts.length === 0 ? (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏦</div>
            <p style={{ fontWeight: 600, marginBottom: "4px" }}>No receiving accounts added yet</p>
            <p className="text-muted text-xs">
              Add your CBE account or Telebirr phone number so verified customer payments match your accounts.
            </p>
          </div>
        ) : (
          <>
            {/* CBE GROUP */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "18px" }}>🏦</span>
                <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Commercial Bank of Ethiopia (CBE)</h3>
                <span className="badge" style={{ marginLeft: "auto", fontSize: "11px" }}>
                  {groupedAccounts.CBE?.length || 0}
                </span>
              </div>

              {groupedAccounts.CBE?.length === 0 ? (
                <div className="card" style={{ padding: "16px", textAlign: "center", color: "var(--tg-theme-hint-color)" }}>
                  No CBE accounts added.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedAccounts.CBE?.map((acc) => (
                    <AccountItemCard
                      key={acc.id}
                      account={acc}
                      onToggle={() => handleToggle(acc)}
                      onEdit={() => {
                        setEditHolder(acc.accountHolderName);
                        setModal({ type: "edit", account: acc });
                      }}
                      onDelete={() => setModal({ type: "delete", account: acc })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* TELEBIRR GROUP */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "18px" }}>📱</span>
                <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Telebirr Accounts</h3>
                <span className="badge" style={{ marginLeft: "auto", fontSize: "11px" }}>
                  {groupedAccounts.TELEBIRR?.length || 0}
                </span>
              </div>

              {groupedAccounts.TELEBIRR?.length === 0 ? (
                <div className="card" style={{ padding: "16px", textAlign: "center", color: "var(--tg-theme-hint-color)" }}>
                  No Telebirr accounts added.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedAccounts.TELEBIRR?.map((acc) => (
                    <AccountItemCard
                      key={acc.id}
                      account={acc}
                      onToggle={() => handleToggle(acc)}
                      onEdit={() => {
                        setEditHolder(acc.accountHolderName);
                        setModal({ type: "edit", account: acc });
                      }}
                      onDelete={() => setModal({ type: "delete", account: acc })}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── EDIT HOLDER NAME MODAL ── */}
      {modal?.type === "edit" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ padding: "20px", maxWidth: "400px", width: "100%", background: "var(--tg-theme-bg-color, #1c1c1e)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Edit Holder Name</h3>
            <p className="text-muted text-xs" style={{ marginBottom: "16px" }}>
              Account: {modal.account.bankName} - {modal.account.accountNumber}
            </p>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" htmlFor="edit-holder">Account Holder Name</label>
                <input
                  id="edit-holder"
                  className="form-input"
                  type="text"
                  value={editHolder}
                  onChange={(e) => setEditHolder(e.target.value)}
                  disabled={editLoading}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModal(null)}
                  disabled={editLoading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${editLoading ? "btn-loading" : ""}`}
                  disabled={editLoading}
                  style={{ flex: 1 }}
                >
                  {editLoading ? "" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION SHEET ── */}
      {modal?.type === "delete" && (
        <ConfirmSheet
          title="Delete Receiving Account?"
          message={`Are you sure you want to delete ${modal.account.bankName} account (${modal.account.accountNumber})? This cannot be undone.`}
          confirmLabel="Delete Account"
          cancelLabel="Keep Account"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

function AccountItemCard({
  account,
  onToggle,
  onEdit,
  onDelete,
}: {
  account: BankAccount;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        opacity: account.isActive ? 1 : 0.65,
        border: account.isActive ? "1px solid var(--glass-border)" : "1px dashed var(--glass-border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "16px", fontWeight: 700, display: "block" }}>
            {account.accountHolderName}
          </span>
          <code style={{ fontSize: "14px", color: "var(--tg-theme-link-color, #0a84ff)", marginTop: "2px", display: "block" }}>
            {account.accountNumber}
          </code>
        </div>
        <span
          className="badge"
          style={{
            background: account.isActive ? "rgba(48, 209, 88, 0.15)" : "rgba(142, 142, 147, 0.2)",
            color: account.isActive ? "#30d158" : "var(--tg-theme-hint-color)",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {account.isActive ? "Active" : "Disabled"}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <button
          type="button"
          onClick={onToggle}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--glass-border)",
            background: "transparent",
            color: "inherit",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {account.isActive ? "Turn Off" : "Turn On"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--glass-border)",
            background: "transparent",
            color: "inherit",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Edit Name
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(255, 69, 58, 0.3)",
            background: "rgba(255, 69, 58, 0.1)",
            color: "var(--tg-theme-destructive-text-color, #ff453a)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
