"use client";
import { useState, useEffect, useCallback } from "react";
import { miniappAuth, getMe, type UserProfile } from "@/lib/api";
import { getInitData } from "@/lib/telegram";

export type AuthScreen = "loading" | "register" | "login" | "app";

export function useAuth() {
  const [screen, setScreen] = useState<AuthScreen>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveToken = useCallback((t: string) => {
    localStorage.setItem("cf_token", t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cf_token");
    setToken(null);
    setUser(null);
    setScreen("login");
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const profile = await getMe();
      setUser(profile);
      setScreen("app");
    } catch {
      logout();
    }
  }, [logout]);

  // Boot: try Telegram initData first, then fall back to stored token
  useEffect(() => {
    async function boot() {
      setScreen("loading");
      setError(null);

      const initData = getInitData();

      if (initData) {
        try {
          const res = await miniappAuth(initData);
          if (res.needsRegistration) {
            setScreen("register");
            return;
          }
          if (res.needsLink) {
            setScreen("login");
            return;
          }
          if (res.token) {
            saveToken(res.token);
            if (res.user) {
              setUser(res.user);
              setScreen("app");
            } else {
              await loadUser();
            }
            return;
          }
        } catch (e: unknown) {
          console.warn("Telegram auth failed, falling back to stored token:", e);
        }
      }

      // Fall back to stored token
      const stored = localStorage.getItem("cf_token");
      if (stored) {
        setToken(stored);
        await loadUser();
        return;
      }

      setScreen("login");
    }
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { screen, setScreen, user, setUser, token, saveToken, logout, loadUser, error, setError };
}
