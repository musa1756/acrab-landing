/**
 * Первичная (first-touch) атрибуция трафика и 152-ФЗ безопасный beacon на
 * собственный endpoint (`POST https://api.acrab.ru/functions/v1/site-track`).
 * Не передаёт IP, сырой User-Agent, почту или отпечаток устройства.
 */
export const TRAFFIC_STORAGE_KEY = "acrab.traffic.v1";
export const TRAFFIC_VISITED_KEY = "acrab.traffic.visited.v1";
export const SITE_TRACK_URL = "https://api.acrab.ru/functions/v1/site-track";
/**
 * Опциональный Apple App Analytics Provider Token (`pt`).
 * Не хардкодится в публичном репозитории как секрет; задаётся через
 * `PUBLIC_APPLE_PROVIDER_TOKEN` на этапе сборки или передаётся явно в options.
 */
export const APP_STORE_PROVIDER_TOKEN: string | undefined =
  typeof import.meta !== "undefined" && typeof (import.meta as { env?: Record<string, string | undefined> }).env?.PUBLIC_APPLE_PROVIDER_TOKEN === "string"
    ? (import.meta as { env?: Record<string, string | undefined> }).env?.PUBLIC_APPLE_PROVIDER_TOKEN?.trim() || undefined
    : undefined;

export type StoreKind = "appstore" | "googleplay" | "rustore";
export type SiteTrackEventKind = "site_visit" | "store_click";
export type SiteTrackStoreTarget = StoreKind | "web_buy" | "site";

export interface TrafficAttribution {
  clickId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  slug?: string;
  promo?: string;
  refererHost?: string;
  firstLandingPath?: string;
}

export interface SiteTrackPayload {
  click_id: string;
  event_kind: SiteTrackEventKind;
  store_target?: SiteTrackStoreTarget;
  slug?: string;
  page_path?: string;
  first_landing_path?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referer_host?: string;
}

export interface PaymentAttributionPayload {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  clickId?: string;
  slug?: string;
}

/** Строгий UUID v1–v8 (совпадает с валидацией `site-track`). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/i;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const OWN_DOMAIN = "acrab.ru";

const STORE_HOSTS: ReadonlyArray<readonly [host: string, kind: StoreKind]> = [
  ["apps.apple.com", "appstore"],
  ["play.google.com", "googleplay"],
  ["rustore.ru", "rustore"],
];

let lastVisitSignatureInMemory: string | null = null;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(CONTROL_CHARS_RE, "").trim().slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanPath(value: unknown): string | undefined {
  const cleaned = cleanText(value, 160);
  if (!cleaned || !cleaned.startsWith("/")) return undefined;
  return cleaned;
}

function cleanSlug(value: unknown): string | undefined {
  const cleaned = cleanText(value, 64)?.toLowerCase();
  return cleaned && SLUG_RE.test(cleaned) ? cleaned : undefined;
}

function cleanPromo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
  return normalized.length > 0 ? normalized : undefined;
}

/** `/arabic-alphabet/ayn/` → `seo_arabic_alphabet_ayn` (до 40 символов). */
export function buildOrganicCampaignTag(landingPath: string | undefined): string | undefined {
  const path = cleanPath(landingPath);
  if (!path) return undefined;
  const normalized = path
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const slug = normalized || "home";
  return `seo_${slug}`.slice(0, 40);
}

export function generateClickId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6]! & 0x0f) | 0x40;
      bytes[8] = (bytes[8]! & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch { /* fallback below */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isSameDomain(host: string, domain: string): boolean {
  const normalized = domain.toLowerCase();
  return host === normalized || host.endsWith(`.${normalized}`);
}

export function extractExternalRefererHost(referrer: string, ownHost?: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const parsed = new URL(referrer);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    const host = parsed.hostname.toLowerCase().slice(0, 128);
    if (!host) return undefined;
    if (isSameDomain(host, OWN_DOMAIN)) return undefined;
    if (ownHost && isSameDomain(host, ownHost)) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

export function parseTrafficSearch(search: string): Partial<TrafficAttribution> {
  const result: Partial<TrafficAttribution> = {};
  if (!search) return result;
  const params = new URLSearchParams(search);
  const utmSource = cleanText(params.get("utm_source"), 64);
  const utmMedium = cleanText(params.get("utm_medium"), 64);
  const utmCampaign = cleanText(params.get("utm_campaign"), 96);
  const utmContent = cleanText(params.get("utm_content"), 96);
  const rawClickId = params.get("click_id");
  const slug = cleanSlug(params.get("slug"));
  const promo = cleanPromo(params.get("promo"));

  if (utmSource) result.utmSource = utmSource;
  if (utmMedium) result.utmMedium = utmMedium;
  if (utmCampaign) result.utmCampaign = utmCampaign;
  if (utmContent) result.utmContent = utmContent;
  if (isUuid(rawClickId)) result.clickId = rawClickId.trim().toLowerCase();
  if (slug) result.slug = slug;
  if (promo) result.promo = promo;
  return result;
}

export function decodeTrafficAttribution(raw: unknown): TrafficAttribution | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!isUuid(row.clickId)) return null;
  const result: TrafficAttribution = { clickId: row.clickId.trim().toLowerCase() };
  const utmSource = cleanText(row.utmSource, 64);
  const utmMedium = cleanText(row.utmMedium, 64);
  const utmCampaign = cleanText(row.utmCampaign, 96);
  const utmContent = cleanText(row.utmContent, 96);
  const slug = cleanSlug(row.slug);
  const promo = cleanPromo(row.promo);
  const refererHost = cleanText(row.refererHost, 128)?.toLowerCase();
  const firstLandingPath = cleanPath(row.firstLandingPath);

  if (utmSource) result.utmSource = utmSource;
  if (utmMedium) result.utmMedium = utmMedium;
  if (utmCampaign) result.utmCampaign = utmCampaign;
  if (utmContent) result.utmContent = utmContent;
  if (slug) result.slug = slug;
  if (promo) result.promo = promo;
  if (refererHost && !isSameDomain(refererHost, OWN_DOMAIN)) result.refererHost = refererHost;
  if (firstLandingPath) result.firstLandingPath = firstLandingPath;
  return result;
}

export function mergeTrafficAttribution(
  existing: TrafficAttribution | null,
  incoming: Partial<TrafficAttribution>,
  refererHost?: string,
  nextClickId: () => string = generateClickId,
  landingPath?: string,
): { attribution: TrafficAttribution; isFreshLanding: boolean } {
  const hasIncomingCampaign = Boolean(
    incoming.utmSource ||
    incoming.utmMedium ||
    incoming.utmCampaign ||
    incoming.utmContent ||
    incoming.slug ||
    incoming.clickId,
  );

  const clickId = isUuid(incoming.clickId)
    ? incoming.clickId.trim().toLowerCase()
    : existing && isUuid(existing.clickId)
      ? existing.clickId
      : nextClickId();

  const merged: TrafficAttribution = { clickId };

  if (incoming.utmSource) {
    merged.utmSource = incoming.utmSource;
    if (incoming.utmMedium) merged.utmMedium = incoming.utmMedium;
    if (incoming.utmCampaign) merged.utmCampaign = incoming.utmCampaign;
    if (incoming.utmContent) merged.utmContent = incoming.utmContent;
    if (incoming.slug) merged.slug = incoming.slug;
  } else {
    const utmSource = existing?.utmSource;
    const utmMedium = incoming.utmMedium ?? existing?.utmMedium;
    const utmCampaign = incoming.utmCampaign ?? existing?.utmCampaign;
    const utmContent = incoming.utmContent ?? existing?.utmContent;
    const slug = incoming.slug ?? existing?.slug;
    if (utmSource) merged.utmSource = utmSource;
    if (utmMedium) merged.utmMedium = utmMedium;
    if (utmCampaign) merged.utmCampaign = utmCampaign;
    if (utmContent) merged.utmContent = utmContent;
    if (slug) merged.slug = slug;
  }

  const promo = incoming.promo ?? existing?.promo;
  if (promo) merged.promo = promo;

  const nextReferer = hasIncomingCampaign && refererHost
    ? refererHost
    : existing?.refererHost ?? refererHost;
  if (nextReferer) merged.refererHost = nextReferer;

  const firstLandingPath = existing?.firstLandingPath ?? cleanPath(landingPath);
  if (firstLandingPath) merged.firstLandingPath = firstLandingPath;

  return {
    attribution: merged,
    isFreshLanding: !existing || hasIncomingCampaign,
  };
}

export function storeKindFromHref(href: string, baseHref = "https://acrab.ru/"): StoreKind | null {
  if (!href) return null;
  let host: string;
  try {
    host = new URL(href, baseHref).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [storeHost, kind] of STORE_HOSTS) {
    if (host === storeHost || host.endsWith(`.${storeHost}`)) return kind;
  }
  return null;
}

export function buildGooglePlayReferrer(attribution: Partial<TrafficAttribution> | null | undefined): string | null {
  if (!attribution) return null;
  const params = new URLSearchParams();
  if (attribution.utmSource) params.set("utm_source", attribution.utmSource);
  if (attribution.utmMedium) params.set("utm_medium", attribution.utmMedium);
  const campaign = attribution.utmCampaign || attribution.slug || buildOrganicCampaignTag(attribution.firstLandingPath);
  if (campaign) params.set("utm_campaign", campaign);
  if (attribution.utmContent) params.set("utm_content", attribution.utmContent);
  if (attribution.clickId && isUuid(attribution.clickId)) params.set("click_id", attribution.clickId.toLowerCase());
  const encoded = params.toString();
  return encoded.length > 0 ? encoded : null;
}

export interface DecorateStoreUrlOptions {
  /** Apple App Analytics Provider Token (`pt`); если не задан, берётся из `APP_STORE_PROVIDER_TOKEN`. */
  providerToken?: string;
}

export function decorateStoreUrl(
  href: string,
  attribution: Partial<TrafficAttribution> | null | undefined,
  options: DecorateStoreUrlOptions = {},
): string {
  if (!href || !attribution) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  const kind = storeKindFromHref(url.href);
  if (kind === "googleplay") {
    const referrer = buildGooglePlayReferrer(attribution);
    if (!referrer) return href;
    url.searchParams.set("referrer", referrer);
    return url.toString();
  }
  if (kind === "appstore") {
    const ct = cleanText(
      attribution.utmCampaign || attribution.slug || buildOrganicCampaignTag(attribution.firstLandingPath),
      40,
    );
    if (!ct) return href;
    const pt = cleanText(options.providerToken ?? APP_STORE_PROVIDER_TOKEN, 32);
    if (pt) url.searchParams.set("pt", pt);
    url.searchParams.set("ct", ct);
    url.searchParams.set("mt", "8");
    return url.toString();
  }
  return href;
}

export function buildSiteTrackPayload(
  eventKind: SiteTrackEventKind,
  attribution: TrafficAttribution,
  options: { storeTarget?: SiteTrackStoreTarget; pagePath?: string } = {},
): SiteTrackPayload {
  const payload: SiteTrackPayload = {
    click_id: attribution.clickId,
    event_kind: eventKind,
  };
  if (options.storeTarget) payload.store_target = options.storeTarget;
  if (attribution.slug) payload.slug = attribution.slug;
  const pagePath = cleanText(options.pagePath, 160);
  if (pagePath) payload.page_path = pagePath;
  const firstLandingPath = cleanPath(attribution.firstLandingPath);
  if (firstLandingPath) payload.first_landing_path = firstLandingPath;
  if (attribution.utmSource) payload.utm_source = attribution.utmSource;
  if (attribution.utmMedium) payload.utm_medium = attribution.utmMedium;
  if (attribution.utmCampaign) payload.utm_campaign = attribution.utmCampaign;
  if (attribution.utmContent) payload.utm_content = attribution.utmContent;
  if (attribution.refererHost) payload.referer_host = attribution.refererHost;
  return payload;
}

export function toPaymentAttribution(
  attribution: TrafficAttribution | null | undefined,
): PaymentAttributionPayload | null {
  if (!attribution) return null;
  const payload: PaymentAttributionPayload = {};
  if (attribution.utmSource) payload.utmSource = attribution.utmSource;
  if (attribution.utmMedium) payload.utmMedium = attribution.utmMedium;
  if (attribution.utmCampaign) payload.utmCampaign = attribution.utmCampaign;
  if (attribution.utmContent) payload.utmContent = attribution.utmContent;
  if (isUuid(attribution.clickId)) payload.clickId = attribution.clickId;
  if (attribution.slug) payload.slug = attribution.slug;
  return Object.keys(payload).length > 0 ? payload : null;
}

function readFromStorage(storage: Storage | undefined): TrafficAttribution | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(TRAFFIC_STORAGE_KEY);
    return raw ? decodeTrafficAttribution(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeToStorage(storage: Storage | undefined, attribution: TrafficAttribution): void {
  if (!storage) return;
  try {
    storage.setItem(TRAFFIC_STORAGE_KEY, JSON.stringify(attribution));
  } catch { /* storage unavailable */ }
}

export function readTrafficAttribution(): TrafficAttribution | null {
  if (typeof window === "undefined") return null;
  return readFromStorage(window.sessionStorage) ?? readFromStorage(window.localStorage);
}

export function writeTrafficAttribution(attribution: TrafficAttribution): void {
  if (typeof window === "undefined") return;
  writeToStorage(window.sessionStorage, attribution);
  writeToStorage(window.localStorage, attribution);
}

export function captureTrafficAttribution(): { attribution: TrafficAttribution; isFreshLanding: boolean } {
  const existing = readTrafficAttribution();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const ownHost = typeof window !== "undefined" ? window.location.hostname : undefined;
  const landingPath = typeof window !== "undefined" ? window.location.pathname : undefined;
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const incoming = parseTrafficSearch(search);
  const refererHost = extractExternalRefererHost(referrer, ownHost);
  const result = mergeTrafficAttribution(existing, incoming, refererHost, generateClickId, landingPath);
  writeTrafficAttribution(result.attribution);
  return result;
}

export function sendSiteTrackBeacon(payload: SiteTrackPayload): void {
  if (typeof window === "undefined") return;
  let body: string;
  try {
    body = JSON.stringify(payload);
  } catch {
    return;
  }
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // text/plain — CORS-safelisted content-type, поэтому sendBeacon не
      // спотыкается о preflight при Access-Control-Allow-Origin: *; сервер
      // разбирает тело через JSON.parse.
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(SITE_TRACK_URL, blob)) return;
    }
  } catch { /* fall back to fetch */ }

  try {
    if (typeof fetch === "function") {
      void fetch(SITE_TRACK_URL, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body,
      }).catch(() => {});
    }
  } catch { /* silent for adblockers/offline */ }
}

function visitSignature(attribution: TrafficAttribution): string {
  return [
    attribution.clickId,
    attribution.utmSource ?? "",
    attribution.utmMedium ?? "",
    attribution.utmCampaign ?? "",
    attribution.utmContent ?? "",
    attribution.slug ?? "",
  ].join("|");
}

export function sendSiteVisitOnce(
  attribution: TrafficAttribution,
  pagePath = typeof window !== "undefined" ? window.location.pathname : "/",
): boolean {
  const signature = visitSignature(attribution);
  if (lastVisitSignatureInMemory === signature) return false;
  try {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(TRAFFIC_VISITED_KEY) === signature) {
      lastVisitSignatureInMemory = signature;
      return false;
    }
  } catch { /* storage unavailable */ }

  lastVisitSignatureInMemory = signature;
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TRAFFIC_VISITED_KEY, signature);
    }
  } catch { /* storage unavailable */ }

  const storeTarget: SiteTrackStoreTarget = pagePath.startsWith("/buy") ? "web_buy" : "site";
  sendSiteTrackBeacon(buildSiteTrackPayload("site_visit", attribution, { storeTarget, pagePath }));
  return true;
}

export function sendStoreClickBeacon(
  store: StoreKind,
  attribution: TrafficAttribution,
  pagePath = typeof window !== "undefined" ? window.location.pathname : "/",
): void {
  sendSiteTrackBeacon(buildSiteTrackPayload("store_click", attribution, { storeTarget: store, pagePath }));
}
