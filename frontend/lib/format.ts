import type { Lang } from "./i18n/I18nProvider";

const LOCALES: Record<Lang, string> = { en: "en-GB", si: "si-LK", ta: "ta-LK" };

/** "LKR 15,550" — same format in every language so prices are easy to compare. */
export function formatLKR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `LKR ${Math.round(value).toLocaleString("en-US")}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

/** Parse "YYYY-MM-DD" as a local date (avoids time-zone shifts). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Number of nights/days in an inclusive range. */
export function daysInclusive(startISO: string, endISO: string): number {
  const ms = parseISODate(endISO).getTime() - parseISODate(startISO).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** e.g. "Mon, 13 Oct" */
export function formatDate(iso: string, lang: Lang): string {
  return parseISODate(iso).toLocaleDateString(LOCALES[lang], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** e.g. "13 Oct 2026" */
export function formatLongDate(iso: string, lang: Lang): string {
  const d = iso.length > 10 ? new Date(iso) : parseISODate(iso);
  return d.toLocaleDateString(LOCALES[lang], { day: "numeric", month: "short", year: "numeric" });
}

/** Short axis label for charts, e.g. "13/10" */
export function formatAxisDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
