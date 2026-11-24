/**
 * Аналитика сайта:
 * 1) Яндекс.Метрика (посещаемость, page_type, цели нажатий на магазины и
 *    микроконверсии; на /buy Вебвизор выключен).
 * 2) Первичная 152-ФЗ атрибуция (UTM, click_id, slug, promo, referer_host,
 *    firstLandingPath) и собственный обезличенный beacon на
 *    https://api.acrab.ru/functions/v1/site-track.
 * 3) Клиентское добавление referrer (Google Play) и ct (App Store) при клике на
 *    кнопку магазина — статический HTML хранит неизменные адреса сторов.
 */
import { COUNTER_ID, resolvePageType, trackGoal, type PageType, type Ym } from "./analytics-goals";
import {
  captureTrafficAttribution,
  decorateStoreUrl,
  readTrafficAttribution,
  sendSiteVisitOnce,
  sendStoreClickBeacon,
  storeKindFromHref,
  type StoreKind,
} from "./traffic-attribution";

export { COUNTER_ID, resolvePageType, trackGoal, type PageType };

const STORE_GOALS: Record<StoreKind, string> = {
  appstore: "store_appstore",
  googleplay: "store_googleplay",
  rustore: "store_rustore",
};

function loadCounter(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.ym) {
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

  const pageType = resolvePageType(location.pathname);
  window.ym(COUNTER_ID, "params", { page_type: pageType });
}

function initCtaImpressionTracking(pageType: PageType): void {
  if (typeof document === "undefined" || typeof IntersectionObserver === "undefined") return;
  const targets = document.querySelectorAll<HTMLElement>(".guide-cta");
  if (targets.length === 0) return;
  let seen = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (seen) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          seen = true;
          trackGoal("cta_seen", { page_type: pageType });
          observer.disconnect();
          break;
        }
      }
    },
    { threshold: 0.4 },
  );
  for (const el of targets) observer.observe(el);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__acrabAnalyticsInit) {
  window.__acrabAnalyticsInit = true;
  const { attribution: initialAttribution } = captureTrafficAttribution();
  sendSiteVisitOnce(initialAttribution, location.pathname);
  loadCounter();

  const pageType = resolvePageType(location.pathname);
  initCtaImpressionTracking(pageType);

  const findStoreLink = (target: EventTarget | null): { link: HTMLAnchorElement; store: StoreKind } | null => {
    const link = (target as Element | null)?.closest?.("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return null;
    const href = link.getAttribute("href") || "";
    const store = storeKindFromHref(href, location.href);
    if (!store) return null;
    return { link, store };
  };

  const decorateLink = (link: HTMLAnchorElement): void => {
    const attribution = readTrafficAttribution() ?? initialAttribution;
    const currentHref = link.getAttribute("href") || "";
    const decorated = decorateStoreUrl(currentHref, attribution);
    if (decorated !== currentHref) {
      link.setAttribute("href", decorated);
    }
  };

  const placementOf = (link: HTMLAnchorElement): string =>
    link.getAttribute("data-cta-placement") ||
    link.closest<HTMLElement>("[data-cta-placement]")?.getAttribute("data-cta-placement") ||
    "default";

  const trackStoreInteraction = (link: HTMLAnchorElement, store: StoreKind): void => {
    decorateLink(link);
    const attribution = readTrafficAttribution() ?? initialAttribution;
    const placement = placementOf(link);
    const goalParams = { store, placement, page_type: pageType };
    trackGoal(STORE_GOALS[store], goalParams);
    trackGoal("store_click", goalParams);
    sendStoreClickBeacon(store, attribution, location.pathname);
  };

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
}
