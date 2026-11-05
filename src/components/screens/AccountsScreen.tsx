"use client";
import { useState, useEffect, useCallback } from "react";
import AccountCard from "@/components/ui/AccountCard";
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

const BANKS = ["CBE", "Awash", "Dashen", "Abyssinia", "Wegagen", "Zemen", "Nib", "United", "Oromia", "Berhan", "Other"];

type ModalState =
  | { type: "delete"; account: BankAccount }
  | { type: "edit"; account: BankAccount }
  | null;

export default function AccountsScreen({ user, showToast }: AccountsScreenProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [addBank, setAddBank] = useState("CBE");
  const [addNumber, setAddNumber] = useState("");
  const [addHolder, setAddHolder] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit form
  const [editHolder, setEditHolder] = useState("");

  const isManager = user.role === "MANAGER" || user.role === "ADMIN";

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch {
      showToast("Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Group by bank
  const grouped = accounts.reduce<Record<string, BankAccount[]>>((acc, a) => {
    if (!acc[a.bank]) acc[a.bank] = [];
    acc[a.bank].push(a);
    return acc;
  }, {});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addNumber.trim() || !addHolder.trim()) {
      showToast("Please fill all fields", "error");
      return;
    }
    setAddLoading(true);
    try {
      const created = await addAccount({ bankName: addBank, accountNumber: addNumber.trim(), accountHolderName: addHolder.trim() });
      haptic("success");
      setAccounts((prev) => [...prev, created]);
      setAddNumber("");
      setAddHolder("");
      setShowAdd(false);
      showToast("Account added ✓", "success");
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to add account", "error");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const updated = await toggleAccount(id, isActive);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(updated.isActive ? "Account activated" : "Account deactivated", "info");
    } catch {
      showToast("Failed to update account", "error");
    }
  }

  async function handleDelete() {
    if (!modal || modal.type !== "delete") return;
    try {
      await deleteAccount(modal.account.id);
      haptic("success");
      setAccounts((prev) => prev.filter((a) => a.id !== modal.account.id));
      showToast("Account deleted", "success");
    } catch {
      haptic("error");
      showToast("Failed to delete account", "error");
    }
    setModal(null);
  }

  async function handleEdit() {
    if (!modal || modal.type !== "edit") return;
    if (!editHolder.trim()) { showToast("Holder name is required", "error"); return; }
    try {
      const updated = await updateAccount(modal.account.id, editHolder.trim());
      haptic("success");
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast("Account updated ✓", "success");
    } catch {
      haptic("error");
      showToast("Failed to update account", "error");
    }
    setModal(null);
  }

  return (
    <>
      <div className="screen">
        <div className="screen-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 className="screen-title">Bank Accounts</h1>
            {isManager && (
              <button
                id="add-account-btn"
                className="btn btn-primary"
                style={{ width: "auto", padding: "8px 16px", fontSize: "13px" }}
                onClick={() => { haptic("light"); setShowAdd((v) => !v); }}
              >
                {showAdd ? "✕ Close" : "+ Add"}
              </button>
            )}
          </div>
        </div>

        <div className="screen-content">
          {/* Add Account Form */}
          {showAdd && isManager && (
            <form onSubmit={handleAdd} className="card" style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>New Account</p>

              <div className="form-group">
                <label className="form-label" htmlFor="add-bank">Bank</label>
                <select id="add-bank" className="form-input form-select" value={addBank} onChange={(e) => setAddBank(e.target.value)}>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-number">Account Number</label>
                <input
                  id="add-number"
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1000123456789"
                  value={addNumber}
                  onChange={(e) => setAddNumber(e.target.value)}
                  disabled={addLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-holder">Holder Name</label>
                <input
                  id="add-holder"
                  className="form-input"
                  type="text"
                  placeholder="John Doe"
                  value={addHolder}
                  onChange={(e) => setAddHolder(e.target.value)}
                  disabled={addLoading}
                />
              </div>

              <button type="submit" className={`btn btn-primary ${addLoading ? "btn-loading" : ""}`} disabled={addLoading}>
                {addLoading ? "" : "Add Account"}
              </button>
            </form>
          )}

          {/* Account List */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "48px" }}>
              <div className="spinner" />
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: "64px" }}>
              <p style={{ fontSize: "40px", marginBottom: "12px" }}>🏦</p>
              <p style={{ fontWeight: 600 }}>No accounts yet</p>
              {isManager && <p className="text-muted text-sm" style={{ marginTop: "6px" }}>Tap "+ Add" to add one</p>}
            </div>
          ) : (
            Object.entries(grouped).map(([bank, accs]) => (
              <div key={bank} style={{ marginBottom: "20px" }}>
                <p className="section-label">{bank}</p>
                {accs.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    isManager={isManager}
                    onToggle={(a) => handleToggle(a.id, a.isActive)}
                    onEdit={(a) => { setEditHolder(a.accountHolderName); setModal({ type: "edit", account: a }); }}
                    onDelete={(a) => setModal({ type: "delete", account: a })}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {modal?.type === "delete" && (
        <ConfirmSheet
          title="Delete Account"
          message={`Remove "${modal.account.accountHolderName}" (${modal.account.bankName}) permanently? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Edit sheet */}
      {modal?.type === "edit" && (
        <>
          <div className="overlay" onClick={() => setModal(null)} />
          <div className="sheet" role="dialog" aria-labelledby="edit-title">
            <div className="sheet-handle" />
            <h3 id="edit-title" style={{ fontWeight: 700, fontSize: "18px", marginBottom: "16px" }}>
              Edit Holder Name
            </h3>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" htmlFor="edit-holder">Holder Name</label>
              <input
                id="edit-holder"
                className="form-input"
                type="text"
                value={editHolder}
                onChange={(e) => setEditHolder(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button id="edit-save-btn" className="btn btn-primary" style={{ flex: 1 }} onClick={handleEdit}>Save</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
