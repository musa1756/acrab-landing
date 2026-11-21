import {
  decodePromoCheckResponse,
  DEFAULT_ANNUAL_LIFETIME_PRICE,
  DEFAULT_PRICES,
  isPlan,
  LEGAL_DOCUMENT_VERSION,
  normalizePromoCodeInput,
  type PaymentResponse,
  type Plan,
  type Pricing,
  type Prices,
  type PricingRow,
  type PromoCheckResult,
  type SubscriptionRow,
  type VerifyResponse,
} from "./payment-model";
import type { PaymentAttributionPayload } from "../../scripts/traffic-attribution";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbnR5eXhheWtmcWlpZHRicnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4Mzc5NTUsImV4cCI6MjA4OTQxMzk1NX0.67LqXrXubiNGeI36qsO0NLgwoNhQJsRwGLDOz1AdlhQ";
const SUPABASE_URL = "https://api.acrab.ru";
type JsonValue = Record<string, unknown> | Array<unknown> | null;

export class PaymentApiError extends Error {
  readonly status?: number;
  readonly code?: string | null;
  constructor(message: string, status?: number, code?: string | null) {
    super(message);
    this.name = "PaymentApiError";
    if (status !== undefined) this.status = status;
    if (code !== undefined) this.code = code;
  }
}

export function asPaymentApiError(error: unknown): PaymentApiError {
  return error instanceof PaymentApiError ? error : new PaymentApiError(error instanceof Error ? error.message : String(error));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function supabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("apikey", SUPABASE_ANON_KEY);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let json: JsonValue = null;
  try { json = text ? JSON.parse(text) as JsonValue : null; } catch { /* non-JSON response */ }
  if (!response.ok) {
    const body = isRecord(json) ? json : null;
    const message = body && (body.error_description || body.error || body.msg);
    const code = body && typeof body.error_code === "string" ? body.error_code : null;
    throw new PaymentApiError(typeof message === "string" ? message : `Ошибка ${response.status}`, response.status, code);
  }
  return json as T | null;
}

export async function requestOtp(email: string): Promise<void> {
  await supabaseFetch("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email, create_user: false }) });
}

export function verifyOtp(email: string, token: string): Promise<VerifyResponse | null> {
  return supabaseFetch<VerifyResponse>("/auth/v1/verify", { method: "POST", body: JSON.stringify({ email, token, type: "email" }) });
}

export async function loadPricing(): Promise<Pricing> {
  const prices: Prices = { ...DEFAULT_PRICES };
  let annualLifetimePrice = DEFAULT_ANNUAL_LIFETIME_PRICE;
  try {
    const rows = await supabaseFetch<PricingRow[]>("/rest/v1/premium_pricing?select=plan,amount,currency");
    if (Array.isArray(rows)) for (const row of rows) {
      if (row.currency !== "RUB" || typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount < 0) continue;
      if (row.plan === "lifetime_annual") annualLifetimePrice = row.amount;
      else if (isPlan(row.plan)) prices[row.plan] = row.amount;
    }
  } catch { /* keep hard-coded fallback prices */ }
  return { prices, annualLifetimePrice };
}

// Своя строка подписки читается по RLS-политике subscriptions_select_own.
// Нужна только для показа цены: право на льготный переход и итоговую сумму
// в любом случае решает сервер при создании оплаты.
export async function loadSubscription(accessToken: string): Promise<SubscriptionRow | null> {
  try {
    const rows = await supabaseFetch<SubscriptionRow[]>("/rest/v1/subscriptions?select=plan,tier,status,current_period_end&limit=1", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return Array.isArray(rows) ? rows[0] ?? null : null;
  } catch { return null; }
}

/** Проверяет промокод друга или блогера через RPC `check_promo_code`. */
export async function checkPromoCode(code: string, accessToken?: string | null): Promise<PromoCheckResult> {
  const normalized = normalizePromoCodeInput(code);
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const raw = await supabaseFetch<unknown>("/rest/v1/rpc/check_promo_code", {
    method: "POST",
    headers,
    body: JSON.stringify({ p_code: normalized }),
  });
  return decodePromoCheckResponse(raw, normalized);
}

// Та же проверка, что `decodePaymentSession` в приложении: ссылка приходит от
// нашей функции tochka-payment, поэтому достаточно HTTPS без логина и пароля.
// Список доменов «Точки» здесь не держим: платёжные страницы банка живут не на
// tochka.com, и такой список отбрасывал настоящие ссылки как «ошибку 500».
export function isSecurePaymentLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const link = new URL(value);
    return link.protocol === "https:" && link.hostname.length > 0 && !link.username && !link.password;
  } catch { return false; }
}

export interface CreatedPayment { paymentLink: string; expiresAt: string | null; }

export interface CreatePaymentOptions {
  promoCode?: string | null;
  attribution?: PaymentAttributionPayload | null;
}

function compactAttribution(attribution: PaymentAttributionPayload | null | undefined): PaymentAttributionPayload | null {
  if (!attribution) return null;
  const result: PaymentAttributionPayload = {};
  if (attribution.utmSource) result.utmSource = attribution.utmSource;
  if (attribution.utmMedium) result.utmMedium = attribution.utmMedium;
  if (attribution.utmCampaign) result.utmCampaign = attribution.utmCampaign;
  if (attribution.utmContent) result.utmContent = attribution.utmContent;
  if (attribution.clickId) result.clickId = attribution.clickId;
  if (attribution.slug) result.slug = attribution.slug;
  return Object.keys(result).length > 0 ? result : null;
}

export function buildCreatePaymentBody(plan: Plan, options: CreatePaymentOptions = {}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    action: "create",
    plan,
    legalAcceptance: {
      offerVersion: LEGAL_DOCUMENT_VERSION,
      personalDataConsentVersion: LEGAL_DOCUMENT_VERSION,
      source: "web-checkout",
    },
  };
  const promo = options.promoCode ? normalizePromoCodeInput(options.promoCode) : "";
  if (promo) {
    body.promoCode = promo;
    body.referralCode = promo;
  }
  const attribution = compactAttribution(options.attribution);
  if (attribution) {
    body.attribution = attribution;
  }
  return body;
}

export async function createPayment(
  accessToken: string,
  plan: Plan,
  options: CreatePaymentOptions = {},
): Promise<CreatedPayment> {
  const result = await supabaseFetch<PaymentResponse>("/functions/v1/tochka-payment", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(buildCreatePaymentBody(plan, options)),
  });
  if (!result || !isSecurePaymentLink(result.paymentLink)) throw new PaymentApiError("Missing or insecure paymentLink", 500);
  return { paymentLink: result.paymentLink, expiresAt: typeof result.expiresAt === "string" ? result.expiresAt : null };
}
