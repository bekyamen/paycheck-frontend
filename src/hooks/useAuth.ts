"use client";
import { useState, useEffect, useCallback } from "react";
import { miniappAuth, getMe, logout as apiLogout, type UserProfile } from "@/lib/api";
import { getInitData } from "@/lib/telegram";

export type AuthScreen = "loading" | "register" | "login" | "app";

export function useAuth() {
  const [screen, setScreen] = useState<AuthScreen>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveToken = useCallback((t: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cf_logged_out");
      localStorage.setItem("cf_token", t);
    }
    setToken(t);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== "undefined") {
      // Explicitly mark user as logged out to prevent blind auto-login with platform initData
      localStorage.setItem("cf_logged_out", "true");
      localStorage.removeItem("cf_token");
      localStorage.removeItem("cf_user");
      try {
        sessionStorage.clear();
      } catch {}
      try {
        // Clear client-accessible cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/");
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/app");
        });
      } catch {}
    }
    setToken(null);
    setUser(null);
    setError(null);
    setScreen("login");
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const data = await getMe();
      if (data?.user) {
        setUser(data.user);
        setScreen("app");
      } else {
        throw new Error("No user profile returned");
      }
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("cf_token");
        localStorage.removeItem("cf_user");
      }
      setToken(null);
      setUser(null);
      setScreen("login");
    }
  }, []);

  // Boot sequence: Check Telegram initData or stored token
  useEffect(() => {
    async function boot() {
      setScreen("loading");
      setError(null);

      // Check if the user explicitly chose to sign out
      const isExplicitlyLoggedOut =
        typeof window !== "undefined" &&
        localStorage.getItem("cf_logged_out") === "true";

      // If user explicitly signed out, do NOT blindly auto-login with platform initData
      if (isExplicitlyLoggedOut) {
        setToken(null);
        setUser(null);
        setScreen("login");
        return;
      }

      const initData = getInitData();

      if (initData) {
        try {
          const res = await miniappAuth(initData);
          if (res.needsRegistration) {
            setScreen("register");
            return;
          }
          if (res.token) {
            saveToken(res.token);
            if (res.user) {
              setUser(res.user);
              setScreen("app");
              return;
            } else {
              await loadUser();
              return;
            }
          }
        } catch (e: unknown) {
          console.warn("Telegram auth failed, falling back to local storage:", e);
        }
      }

      // Check stored token
      const stored = typeof window !== "undefined" ? localStorage.getItem("cf_token") : null;
      if (stored) {
        setToken(stored);
        await loadUser();
        return;
      }

      setScreen("login");
    }

    boot();
  }, [loadUser, saveToken]);

  return { screen, setScreen, user, setUser, token, saveToken, logout, loadUser, error, setError };
}
