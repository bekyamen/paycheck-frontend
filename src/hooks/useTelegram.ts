"use client";
import { useEffect, useState } from "react";
import { getTelegram, getTelegramUser, type TelegramWebApp } from "@/lib/telegram";

export function useTelegram() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<ReturnType<typeof getTelegramUser>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const webapp = getTelegram();
    setTg(webapp);
    setUser(getTelegramUser());

    if (webapp) {
      webapp.ready();
      webapp.expand();
    }
    setReady(true);
  }, []);

  return { tg, user, ready };
}
