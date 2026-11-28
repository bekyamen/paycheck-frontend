/**
 * support.ts
 * Single shared configuration for support and contact details.
 */

export interface SupportConfig {
  telegramUsername: string; // e.g. "@bekyT"
  telegramUrl: string;
  phoneNumber: string; // E.164 tel: format
  phoneDisplay: string; // Human-readable format
  timezone: string; // Africa/Addis_Ababa
  workingDays: string; // Mon - Mon
  workingHours: string; // 24 hours
  startHour: number; // 8 (08:00)
  endHour: number; // 18 (18:00)
}

export const SUPPORT_CONFIG: SupportConfig = {
  telegramUsername: "@bekyT",
  telegramUrl: "https://t.me/bekyT",
  phoneNumber: "+251940395625",
  phoneDisplay: "+251940395625",
  timezone: "Africa/Addis_Ababa",
  workingDays: "Mon - Mon",
  workingHours: "24 hours",
  startHour: 8,
  endHour: 18,
};

export interface OfficeHoursStatus {
  isOpen: boolean;
  badgeLabel: string;
  detail: string;
  currentTimeString: string;
}

/**
 * Calculates whether the office is currently open based on Addis Ababa time (UTC+3).
 * Working hours: Mon-Mon 24 hours (Africa/Addis_Ababa).
 */
export function getAddisAbabaOfficeStatus(date: Date = new Date()): OfficeHoursStatus {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: SUPPORT_CONFIG.timezone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const weekday = map.weekday; // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    const hour = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const timeDec = hour + minute / 60;

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: SUPPORT_CONFIG.timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const currentTimeString = timeFormatter.format(date);

    const is24Hours =
      SUPPORT_CONFIG.workingHours.toLowerCase().includes("24") ||
      SUPPORT_CONFIG.workingDays.toLowerCase().includes("mon - mon");

    const isWorkingDay = is24Hours || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday);
    const isWorkingHour = is24Hours || (timeDec >= SUPPORT_CONFIG.startHour && timeDec < SUPPORT_CONFIG.endHour);
    const isOpen = is24Hours || (isWorkingDay && isWorkingHour);

    if (isOpen) {
      return {
        isOpen: true,
        badgeLabel: is24Hours ? "🟢 Open 24/7" : "🟢 Open Now",
        detail: `${SUPPORT_CONFIG.workingDays} • ${SUPPORT_CONFIG.workingHours}`,
        currentTimeString,
      };
    }

    let detail = `${SUPPORT_CONFIG.workingDays} • ${SUPPORT_CONFIG.workingHours}`;
    if (isWorkingDay && timeDec < SUPPORT_CONFIG.startHour) {
      detail = "Opens today at 8:00 AM EAT";
    } else if (isWorkingDay && timeDec >= SUPPORT_CONFIG.endHour) {
      detail = weekday === "Sat" ? "Opens Monday at 8:00 AM EAT" : "Opens tomorrow at 8:00 AM EAT";
    } else {
      detail = "Opens Monday at 8:00 AM EAT";
    }

    return {
      isOpen: false,
      badgeLabel: "🔴 Currently Closed",
      detail,
      currentTimeString,
    };
  } catch {
    return {
      isOpen: true,
      badgeLabel: "🟢 Open 24/7",
      detail: `${SUPPORT_CONFIG.workingDays} • ${SUPPORT_CONFIG.workingHours}`,
      currentTimeString: "",
    };
  }
}
