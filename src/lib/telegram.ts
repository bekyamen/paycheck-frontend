declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    query_id?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  expand(): void;
  close(): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback: (confirmed: boolean) => void): void;
  HapticFeedback: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  const tg = getTelegram();
  if (tg?.initData) return tg.initData;
  // Dev bypass via URL param
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    return params.get("tgWebAppData") || "";
  }
  return "";
}

export function getTelegramUser() {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user ?? null;
}

export function haptic(type: "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection" = "light") {
  const tg = getTelegram();
  if (!tg?.HapticFeedback) return;
  if (type === "success" || type === "error" || type === "warning") {
    tg.HapticFeedback.notificationOccurred(type);
  } else if (type === "selection") {
    tg.HapticFeedback.selectionChanged();
  } else {
    tg.HapticFeedback.impactOccurred(type as "light" | "medium" | "heavy");
  }
}
