/**
 * Яндекс.Метрика сайта: посещаемость и нажатия на кнопки магазинов.
 * Счётчик принимает данные только с acrab.ru (настройка в Метрике), поэтому
 * локальный запуск ничего не портит. На странице оплаты Вебвизор выключен:
 * там вводят почту.
 */
const COUNTER_ID = 113252004;

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: Ym;
  }
}

const STORE_GOALS: ReadonlyArray<[host: string, goal: string]> = [
  ["apps.apple.com", "store_appstore"],
  ["play.google.com", "store_googleplay"],
  ["rustore.ru", "store_rustore"],
];

function storeGoal(href: string): string | null {
  let host: string;
  try {
    host = new URL(href, location.href).hostname;
  } catch {
    return null;
  }
  for (const [storeHost, goal] of STORE_GOALS) {
    if (host === storeHost || host.endsWith(`.${storeHost}`)) return goal;
  }
  return null;
}

function loadCounter(): void {
  // Очередь до загрузки tag.js — так же, как в официальном коде счётчика.
  const queue: Ym = (...args: unknown[]) => {
    (queue.a ||= []).push(args);
  };
  queue.l = Date.now();
  window.ym = queue;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.append(script);

  const onPayment = location.pathname.startsWith("/buy");
  window.ym(COUNTER_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: !onPayment,
  });
}

loadCounter();

document.addEventListener(
  "click",
  (event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!link) return;
    const goal = storeGoal(link.getAttribute("href") || "");
    if (!goal) return;
    window.ym?.(COUNTER_ID, "reachGoal", goal);
    window.ym?.(COUNTER_ID, "reachGoal", "store_click");
  },
  { capture: true },
);

export {};
