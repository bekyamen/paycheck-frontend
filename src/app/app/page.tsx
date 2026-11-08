"use client";
import { useState, useEffect } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useAuth } from "@/hooks/useAuth";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import BottomNav, { type NavTab } from "@/components/ui/BottomNav";
import LoadingScreen from "@/components/screens/LoadingScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import LoginScreen from "@/components/screens/LoginScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import VerifyPaymentScreen from "@/components/screens/VerifyPaymentScreen";
import AccountsScreen from "@/components/screens/AccountsScreen";
import CashiersScreen from "@/components/screens/CashiersScreen";
import ProfileScreen from "@/components/screens/ProfileScreen";
import { miniappLink, type UserProfile } from "@/lib/api";

export default function MiniAppPage() {
  const { ready } = useTelegram();
  const { screen, setScreen, user, setUser, saveToken, logout } = useAuth();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  const isAdmin = user
    ? (user.isAdmin ?? (user.role === "OWNER" || user.role === "MANAGER" || user.role === "ADMIN"))
    : false;

  // Determine initial active tab based on role
  const [activeTab, setActiveTab] = useState<NavTab>("home");

  // Sync active tab whenever user changes
  useEffect(() => {
    if (user) {
      if (user.role === "CASHIER") {
        setActiveTab("verify");
      } else {
        // Admin defaults to home tab
        setActiveTab((prev) => (prev === "verify" ? "verify" : "home"));
      }
    }
  }, [user]);

  // Scroll to top on screen/tab transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, activeTab]);

  function handleAuthSuccess(token: string, profile: UserProfile, isCashier?: boolean) {
    saveToken(token);
    setUser(profile);
    if (isCashier || profile.role === "CASHIER") {
      setActiveTab("verify");
    } else {
      setActiveTab("home");
    }
    setScreen("app");

    // Automatically link Telegram account if inside Telegram
    const initData = typeof window !== "undefined" ? (window.Telegram?.WebApp?.initData || "") : "";
    if (initData) {
      miniappLink(initData).catch((err: any) => {
        console.warn("Could not link Telegram account:", err?.message);
      });
    }
  }

  // Telegram SDK & initial auth check
  if (!ready || screen === "loading") {
    return <LoadingScreen />;
  }

  if (screen === "register") {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <RegisterScreen
          onSuccess={(token, profile) => handleAuthSuccess(token, profile, false)}
          onGoLogin={() => setScreen("login")}
          showToast={showToast}
        />
      </>
    );
  }

  if (screen === "login") {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <LoginScreen
          onSuccess={handleAuthSuccess}
          onGoRegister={() => setScreen("register")}
          showToast={showToast}
        />
      </>
    );
  }

  // Authenticated "app" view
  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Admin Home Dashboard */}
      {activeTab === "home" && (
        isAdmin ? (
          <HomeScreen
            user={user}
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
          />
        ) : (
          <div className="screen">
            <div className="screen-header">
              <h1 className="screen-title">Admin Dashboard</h1>
            </div>
            <div className="screen-content" style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Admins Only</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "20px" }}>
                This section is for business admins only. Cashiers can verify payments and view their profile.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab("verify")}
              >
                Go to Verify Payment
              </button>
            </div>
          </div>
        )
      )}

      {/* Verify Payment Screen (Available to both Admin and Cashier) */}
      {activeTab === "verify" && (
        <VerifyPaymentScreen
          user={user}
          showToast={showToast}
          onLogout={logout}
        />
      )}

      {/* Receiving Accounts (Admin Only) */}
      {activeTab === "accounts" && (
        <AccountsScreen
          user={user}
          showToast={showToast}
        />
      )}

      {/* Cashiers Management (Admin Only) */}
      {activeTab === "cashiers" && (
        <CashiersScreen
          user={user}
          showToast={showToast}
        />
      )}

      {/* Profile (Both Admin and Cashier) */}
      {activeTab === "profile" && (
        <ProfileScreen
          user={user}
          onLogout={logout}
        />
      )}

      {/* Role-aware Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        isAdmin={isAdmin}
      />
    </>
  );
}
