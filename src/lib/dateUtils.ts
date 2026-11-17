/**
 * dateUtils.ts — Ethiopian & Gregorian date helpers with relative elapsed time.
 */

const ETH_MONTHS = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

/**
 * Format Gregorian date string as "13 Oct 2026, 11:13 PM" in Africa/Addis_Ababa timezone.
 */
export function formatGregorianDateTime(d: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);

    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const dayPeriod = m.dayPeriod ? m.dayPeriod.toUpperCase() : "";
    return `${m.day} ${m.month} ${m.year}, ${m.hour}:${m.minute} ${dayPeriod}`.trim();
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Format Ethiopian Calendar date and 12-hour traditional cycle time.
 * e.g. "ጥቅምት 3, 2019, 5:13 ከምሽት"
 */
export function formatEthiopianDateTime(d: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(d);

    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;

    const ethYear = m.year;
    const monthIdx = parseInt(m.month, 10) - 1;
    const ethMonthName = ETH_MONTHS[monthIdx] || m.month;
    const ethDay = m.day;

    const addisHour = parseInt(m.hour, 10) % 24;
    const minute = String(m.minute).padStart(2, "0");

    let ethHour = (addisHour - 6) % 12;
    if (ethHour <= 0) ethHour += 12;

    let period = "";
    if (addisHour >= 6 && addisHour < 12) {
      period = "ከጠዋቱ";
    } else if (addisHour >= 12 && addisHour < 18) {
      period = "ከሰዓት";
    } else if (addisHour >= 18 && addisHour < 24) {
      period = "ከምሽት";
    } else {
      period = "ከሌሊቱ";
    }

    return `${ethMonthName} ${ethDay}, ${ethYear}, ${ethHour}:${minute} ${period}`;
  } catch {
    return "";
  }
}

/**
 * Format relative elapsed time from verification timestamp.
 * e.g. "26d 13h from verification", "2h 15m from verification", "5m from verification"
 */
export function formatRelativeFromVerification(targetDate: Date, baseDate: Date = new Date()): string {
  try {
    const diffMs = Math.max(0, baseDate.getTime() - targetDate.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    const minutes = diffMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h from verification`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m from verification`;
    }
    if (minutes > 0) {
      return `${minutes}m from verification`;
    }
    return "0m from verification";
  } catch {
    return "";
  }
}
