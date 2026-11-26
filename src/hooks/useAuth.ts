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
      localStorage.removeItem("manual_logout");
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
      // Explicitly mark manual sign-out flag so mini-app won't auto-authenticate on reopen
      localStorage.setItem("manual_logout", "true");
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

      // Check if user manually signed out
      const isManualLogout =
        typeof window !== "undefined" &&
        (localStorage.getItem("manual_logout") === "true" ||
         localStorage.getItem("cf_logged_out") === "true");

      // If manual_logout === 'true', bypass any automatic Telegram session restoration
      // and keep the user on the login page until they explicitly click 'Sign In' again
      if (isManualLogout) {
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
