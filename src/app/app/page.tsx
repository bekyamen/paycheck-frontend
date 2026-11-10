"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
  const { tg, ready } = useTelegram();
  const { screen, setScreen, user, setUser, saveToken, logout } = useAuth();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  const isAdmin = user
    ? (user.isAdmin ?? (user.role === "OWNER" || user.role === "MANAGER" || user.role === "ADMIN"))
    : false;
  const rootTab: NavTab = isAdmin ? "home" : "verify";

  // Derive active tab cleanly without synchronous setState in useEffect
  const [selectedTab, setSelectedTab] = useState<NavTab | null>(null);
  const activeTab: NavTab =
    selectedTab && (isAdmin || selectedTab === "verify" || selectedTab === "profile")
      ? selectedTab
      : rootTab;
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navHistoryRef = useRef<NavTab[]>([]);
  const activeTabRef = useRef<NavTab>(activeTab);
  const handlingPopRef = useRef(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const navigateTab = useCallback(
    (nextTab: NavTab, isBack = false) => {
      const current = activeTabRef.current;
      if (!isBack) {
        if (nextTab === rootTab) {
          navHistoryRef.current = [];
        } else if (current !== nextTab) {
          if (navHistoryRef.current[navHistoryRef.current.length - 1] !== current) {
            navHistoryRef.current.push(current);
          }
          if (!handlingPopRef.current) {
            try {
              window.history.pushState({ cfTab: nextTab }, "");
            } catch {}
          }
        }
      }
      setSelectedTab(nextTab);
    },
    [rootTab]
  );

  const handleGoBack = useCallback(() => {
    const prev = navHistoryRef.current.pop();
    const target = prev ?? (activeTabRef.current !== rootTab ? rootTab : null);
    if (target) {
      navigateTab(target, true);
    }
  }, [navigateTab, rootTab]);

  // Keep Telegram WebApp BackButton & browser popstate working reliably across screens
  useEffect(() => {
    if (screen !== "app" || !user) {
      try { tg?.BackButton?.hide(); } catch {}
      return;
    }

    // LiveReceiptScanner owns BackButton while fullscreen camera overlay is mounted
    if (isScannerOpen) return;

    const canGoBack = activeTab !== rootTab;

    const onBackAction = () => {
      handleGoBack();
    };
    const onPopState = () => {
      if (activeTabRef.current !== rootTab || navHistoryRef.current.length > 0) {
        handlingPopRef.current = true;
        handleGoBack();
        handlingPopRef.current = false;
      }
    };

    window.addEventListener("popstate", onPopState);
    if (tg?.BackButton) {
      try {
        if (canGoBack) {
          tg.BackButton.show();
          tg.BackButton.onClick(onBackAction);
        } else {
          tg.BackButton.hide();
        }
      } catch {}
    }

    return () => {
      window.removeEventListener("popstate", onPopState);
      try {
        tg?.BackButton?.offClick?.(onBackAction);
      } catch {}
    };
  }, [activeTab, handleGoBack, isScannerOpen, rootTab, screen, tg, user]);

  // Scroll to top on screen/tab transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, activeTab]);

  function handleAuthSuccess(token: string, profile: UserProfile, isCashier?: boolean) {
    saveToken(token);
    setUser(profile);
    navHistoryRef.current = [];
    setSelectedTab(isCashier || profile.role === "CASHIER" ? "verify" : "home");
    setScreen("app");

    // Automatically link Telegram account if inside Telegram
    const initData = typeof window !== "undefined" ? (window.Telegram?.WebApp?.initData || "") : "";
    if (initData) {
      miniappLink(initData).catch((err: unknown) => {
        console.warn("Could not link Telegram account:", (err as Error)?.message);
      });
    }
  }

  function handleLogout() {
    navHistoryRef.current = [];
    setSelectedTab(null);
    logout();
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
              navigateTab(tab);
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
                onClick={() => navigateTab("verify")}
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
          onLogout={handleLogout}
          onBack={isAdmin ? handleGoBack : undefined}
          onScannerOpenChange={setIsScannerOpen}
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
          onLogout={handleLogout}
        />
      )}

      {/* Role-aware Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onChange={(tab) => navigateTab(tab)}
        isAdmin={isAdmin}
      />
    </>
  );
}
