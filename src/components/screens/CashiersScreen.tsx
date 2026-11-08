"use client";
import { useState, useEffect, useCallback } from "react";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import type { CashierItem, UserProfile } from "@/lib/api";
import {
  getCashiers,
  createCashier,
  updateCashier,
  setCashierStatus,
  deleteCashier,
} from "@/lib/api";
import { haptic } from "@/lib/telegram";

interface CashiersScreenProps {
  user: UserProfile;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type ModalState =
  | { type: "delete"; cashier: CashierItem }
  | { type: "edit"; cashier: CashierItem }
  | null;

export default function CashiersScreen({ user, showToast }: CashiersScreenProps) {
  const [cashiers, setCashiers] = useState<CashierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // Add form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const isAdmin = user.isAdmin ?? (user.role === "OWNER" || user.role === "MANAGER" || user.role === "ADMIN");

  const fetchCashiers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getCashiers();
      setCashiers(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load cashiers", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    fetchCashiers();
  }, [fetchCashiers]);

  // If cashier tries to view admin screen
  if (!isAdmin) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h1 className="screen-title">Cashiers Management</h1>
        </div>
        <div className="screen-content" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Admins Only</h2>
          <p className="text-muted text-sm">
            This section is for business admins only. Cashiers cannot create or manage other staff accounts.
          </p>
        </div>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      showToast("Cashier full name must be at least 2 characters", "error");
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      showToast("Password must be at least 4 characters", "error");
      return;
    }

    setAddLoading(true);
    try {
      const res = await createCashier({
        fullName: fullName.trim(),
        password: password.trim(),
      });
      haptic("success");
      showToast(res.message || "Cashier account created successfully! ✓", "success");
      setFullName("");
      setPassword("");
      setShowAdd(false);
      await fetchCashiers();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to create cashier", "error");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleToggleStatus(cashier: CashierItem) {
    const nextActive = !cashier.isActive;
    try {
      const res = await setCashierStatus(cashier.id, nextActive);
      haptic("light");
      showToast(res.message || (nextActive ? "Cashier enabled ✓" : "Cashier disabled ✓"), "success");
      await fetchCashiers();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to update cashier status", "error");
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.type !== "edit") return;

    const payload: { fullName?: string; password?: string } = {};
    if (editFullName.trim() && editFullName.trim() !== modal.cashier.fullName) {
      payload.fullName = editFullName.trim();
    }
    if (editPassword.trim()) {
      if (editPassword.trim().length < 4) {
        showToast("New password must be at least 4 characters", "error");
        return;
      }
      payload.password = editPassword.trim();
    }

    if (Object.keys(payload).length === 0) {
      setModal(null);
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateCashier(modal.cashier.id, payload);
      haptic("success");
      showToast(res.message || "Cashier updated successfully! ✓", "success");
      setModal(null);
      await fetchCashiers();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to update cashier", "error");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (modal?.type !== "delete") return;
    try {
      const res = await deleteCashier(modal.cashier.id);
      haptic("success");
      showToast(res.message || "Cashier removed successfully ✓", "success");
      setModal(null);
      await fetchCashiers();
    } catch (err: unknown) {
      haptic("error");
      showToast((err as Error).message || "Failed to delete cashier", "error");
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="screen-title">Cashiers</h1>
            <p className="text-muted text-xs" style={{ marginTop: "2px" }}>
              Staff members who verify payments
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
            {showAdd ? "Cancel" : "+ Add Cashier"}
          </button>
        </div>
      </div>

      <div className="screen-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* ── ADD CASHIER FORM ── */}
        {showAdd && (
          <form onSubmit={handleAdd} className="card" style={{ padding: "18px", border: "1px solid var(--tg-theme-button-color, #0a84ff)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
              Add Staff Cashier
            </h3>

            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label" htmlFor="cashier-fullname">Full Name</label>
              <input
                id="cashier-fullname"
                className="form-input"
                type="text"
                placeholder="e.g. Almaz Tadesse"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={addLoading}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="cashier-pass">Password</label>
              <input
                id="cashier-pass"
                className="form-input"
                type="password"
                placeholder="Unique password for this cashier (min 4 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={addLoading}
              />
              <span className="text-muted text-xs" style={{ marginTop: "4px", display: "block" }}>
                Each cashier in your branch must have their own unique password.
              </span>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${addLoading ? "btn-loading" : ""}`}
              disabled={addLoading}
              style={{ width: "100%" }}
            >
              {addLoading ? "" : "Save Cashier Account"}
            </button>
          </form>
        )}

        {/* ── CASHIERS LIST ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }} className="text-muted text-sm">
            Loading cashiers...
          </div>
        ) : cashiers.length === 0 ? (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>👥</div>
            <p style={{ fontWeight: 600, marginBottom: "4px" }}>No cashiers registered yet</p>
            <p className="text-muted text-xs">
              Add your cashier staff members so they can log in with their password and verify customer payments.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {cashiers.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  opacity: c.isActive ? 1 : 0.65,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "16px", fontWeight: 700, display: "block" }}>
                      {c.fullName}
                    </span>
                    <span className="text-muted text-xs" style={{ marginTop: "2px", display: "block" }}>
                      Branch: {c.branchName || "Main Branch"}
                    </span>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: c.isActive ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
                      color: c.isActive ? "#30d158" : "var(--tg-theme-destructive-text-color, #ff453a)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {c.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
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
                    {c.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFullName(c.fullName);
                      setEditPassword("");
                      setModal({ type: "edit", cashier: c });
                    }}
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
                    Edit / Reset PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "delete", cashier: c })}
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
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── EDIT CASHIER MODAL ── */}
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
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Edit Cashier</h3>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" htmlFor="edit-name">Full Name</label>
                <input
                  id="edit-name"
                  className="form-input"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  disabled={editLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" htmlFor="edit-pass">Reset Password (leave empty to keep current)</label>
                <input
                  id="edit-pass"
                  className="form-input"
                  type="password"
                  placeholder="New password (min 4 chars)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  disabled={editLoading}
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

      {/* ── DELETE CASHIER SHEET ── */}
      {modal?.type === "delete" && (
        <ConfirmSheet
          title="Remove Cashier?"
          message={`Are you sure you want to remove ${modal.cashier.fullName}? They will no longer be able to log in.`}
          confirmLabel="Remove Cashier"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
