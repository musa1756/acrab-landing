import { decorateStoreUrl, parseTrafficSearch, type StoreKind, type TrafficAttribution } from "./traffic-attribution";

export const APP_STORE_URL = "https://apps.apple.com/ru/app/id6763663680";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.acrab.arabic";
export const RUSTORE_URL = "https://www.rustore.ru/catalog/app/com.acrab";

export interface StoreRedirectTarget {
  store: StoreKind;
  url: string;
}

export interface StoreTargetOptions {
  search?: string;
  attribution?: Partial<TrafficAttribution> | null;
}

function combinedAttribution(options?: StoreTargetOptions): Partial<TrafficAttribution> | null {
  const fromSearch = options?.search ? parseTrafficSearch(options.search) : {};
  const fromStored = options?.attribution ?? null;
  const merged: Partial<TrafficAttribution> = {};
  const utmSource = fromSearch.utmSource ?? fromStored?.utmSource;
  const utmMedium = fromSearch.utmMedium ?? fromStored?.utmMedium;
  const utmCampaign = fromSearch.utmCampaign ?? fromStored?.utmCampaign;
  const utmContent = fromSearch.utmContent ?? fromStored?.utmContent;
  const clickId = fromSearch.clickId ?? fromStored?.clickId;
  const slug = fromSearch.slug ?? fromStored?.slug;
  if (utmSource) merged.utmSource = utmSource;
  if (utmMedium) merged.utmMedium = utmMedium;
  if (utmCampaign) merged.utmCampaign = utmCampaign;
  if (utmContent) merged.utmContent = utmContent;
  if (clickId) merged.clickId = clickId;
  if (slug) merged.slug = slug;
  return Object.keys(merged).length > 0 ? merged : null;
}

function requestedStore(search?: string): string | null {
  if (!search) return null;
  const value = new URLSearchParams(search).get("store")?.trim().toLowerCase();
  return value || null;
}

export function resolveStoreRedirect(
  userAgent: string,
  maxTouchPoints: number,
  options?: StoreTargetOptions,
): StoreRedirectTarget | null {
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const attribution = combinedAttribution(options);

  if (isIOS) {
    return {
      store: "appstore",
      url: decorateStoreUrl(APP_STORE_URL, attribution),
    };
  }
  if (isAndroid) {
    if (requestedStore(options?.search) === "rustore") {
      return {
        store: "rustore",
        url: RUSTORE_URL,
      };
    }
    return {
      store: "googleplay",
      url: decorateStoreUrl(GOOGLE_PLAY_URL, attribution),
    };
  }
  return null;
}

export function storeTarget(
  userAgent: string,
  maxTouchPoints: number,
  options?: StoreTargetOptions,
): string | null {
  return resolveStoreRedirect(userAgent, maxTouchPoints, options)?.url ?? null;
}
