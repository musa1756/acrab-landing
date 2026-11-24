/**
 * Лёгкий helper без побочных эффектов для отправки целей в Яндекс.Метрику
 * из любого клиентского скрипта или React-острова (без дублирования init).
 */
export const COUNTER_ID = 113252004;

export type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: Ym;
    __acrabAnalyticsInit?: boolean;
  }
}

export type PageType =
  | "home"
  | "letter"
  | "keyboard"
  | "guide"
  | "articles"
  | "buy"
  | "get"
  | "updates"
  | "support"
  | "legal"
  | "other";

export function resolvePageType(pathname: string): PageType {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (path === "/") return "home";
  if (/^\/arabic-alphabet\/[^/]+\/$/.test(path)) return "letter";
  if (path === "/arabic-keyboard/") return "keyboard";
  if (path === "/articles/") return "articles";
  if (path === "/buy/") return "buy";
  if (path === "/get/") return "get";
  if (path === "/about/") return "updates";
  if (path === "/support/") return "support";
  if (path === "/privacy/" || path === "/offer/" || path === "/consent/") return "legal";
  if (
    path === "/arabic-alphabet/" ||
    path === "/arabic-vowels/" ||
    path === "/sun-moon-letters/" ||
    path === "/arabic-hello/" ||
    path === "/arabic-thank-you/" ||
    path === "/arabic-app/" ||
    path === "/learn-arabic/" ||
    path === "/fusha/" ||
    path.startsWith("/arabic-")
  ) {
    return "guide";
  }
  return "other";
}

export function trackGoal(goal: string, params?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  try {
    if (params) {
      window.ym?.(COUNTER_ID, "reachGoal", goal, params);
    } else {
      window.ym?.(COUNTER_ID, "reachGoal", goal);
    }
  } catch { /* ignore adblock / missing ym */ }
}
