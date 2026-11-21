/**
 * Аналитика сайта:
 * 1) Яндекс.Метрика (посещаемость и цели нажатий на магазины; на /buy Вебвизор выключен).
 * 2) Первичная 152-ФЗ атрибуция (UTM, click_id, slug, promo, referer_host) и
 *    собственный обезличенный beacon на https://api.acrab.ru/functions/v1/site-track.
 * 3) Клиентское добавление referrer (Google Play) и ct (App Store) при клике на
 *    кнопку магазина — статический HTML хранит неизменные адреса сторов.
 */
import {
  captureTrafficAttribution,
  decorateStoreUrl,
  readTrafficAttribution,
  sendSiteVisitOnce,
  sendStoreClickBeacon,
  storeKindFromHref,
  type StoreKind,
} from "./traffic-attribution";

const COUNTER_ID = 113252004;

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: Ym;
  }
}

const STORE_GOALS: Record<StoreKind, string> = {
  appstore: "store_appstore",
  googleplay: "store_googleplay",
  rustore: "store_rustore",
};

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

const { attribution: initialAttribution } = captureTrafficAttribution();
sendSiteVisitOnce(initialAttribution, location.pathname);
loadCounter();

function findStoreLink(target: EventTarget | null): { link: HTMLAnchorElement; store: StoreKind } | null {
  const link = (target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return null;
  const href = link.getAttribute("href") || "";
  const store = storeKindFromHref(href, location.href);
  if (!store) return null;
  return { link, store };
}

function decorateLink(link: HTMLAnchorElement): void {
  const attribution = readTrafficAttribution() ?? initialAttribution;
  const currentHref = link.getAttribute("href") || "";
  const decorated = decorateStoreUrl(currentHref, attribution);
  if (decorated !== currentHref) {
    link.setAttribute("href", decorated);
  }
}

function trackStoreInteraction(link: HTMLAnchorElement, store: StoreKind): void {
  decorateLink(link);
  const attribution = readTrafficAttribution() ?? initialAttribution;
  window.ym?.(COUNTER_ID, "reachGoal", STORE_GOALS[store]);
  window.ym?.(COUNTER_ID, "reachGoal", "store_click");
  sendStoreClickBeacon(store, attribution, location.pathname);
}

// pointerdown успевает обновить href до навигации, в том числе при открытии
// средней кнопкой мыши или контекстным меню.
document.addEventListener(
  "pointerdown",
  (event) => {
    const found = findStoreLink(event.target);
    if (!found) return;
    decorateLink(found.link);
  },
  { capture: true },
);

document.addEventListener(
  "click",
  (event) => {
    const found = findStoreLink(event.target);
    if (!found) return;
    trackStoreInteraction(found.link, found.store);
  },
  { capture: true },
);

document.addEventListener(
  "auxclick",
  (event) => {
    if (event.button !== 1) return;
    const found = findStoreLink(event.target);
    if (!found) return;
    trackStoreInteraction(found.link, found.store);
  },
  { capture: true },
);

export {};
