"use client";
import { useTelegram } from "@/hooks/useTelegram";
import { useAuth } from "@/hooks/useAuth";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import BottomNav, { type NavTab } from "@/components/ui/BottomNav";
import LoadingScreen from "@/components/screens/LoadingScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import LoginScreen from "@/components/screens/LoginScreen";
import AccountsScreen from "@/components/screens/AccountsScreen";
import ProfileScreen from "@/components/screens/ProfileScreen";
import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/api";

export default function MiniAppPage() {
  const { ready } = useTelegram();
  const { screen, setScreen, user, setUser, saveToken, logout } = useAuth();
  const { toasts, show: showToast, remove: removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<NavTab>("accounts");

  // Scroll to top on screen transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  function handleAuthSuccess(token: string, profile: UserProfile) {
    saveToken(token);
    setUser(profile);
    setScreen("app");
  }

  // Don't render until TG SDK and auth boot are done
  if (!ready || screen === "loading") {
    return <LoadingScreen />;
  }

  if (screen === "register") {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <RegisterScreen
          onSuccess={handleAuthSuccess}
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

  // "app" screen — main authenticated area
  if (!user) {
    // Safety fallback if user is null but screen is "app"
    return <LoadingScreen />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {activeTab === "accounts" && (
        <AccountsScreen user={user} showToast={showToast} />
      )}

      {activeTab === "profile" && (
        <ProfileScreen user={user} onLogout={logout} />
      )}

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </>
  );
}
