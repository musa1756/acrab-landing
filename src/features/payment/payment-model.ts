export type Plan = "monthly" | "annual" | "lifetime";
export type PaymentStep = "email" | "code" | "plan";

export interface PricingRow { plan?: unknown; amount?: unknown; currency?: unknown; }
export interface VerifyResponse { access_token?: unknown; expires_in?: unknown; expires_at?: unknown; }
export interface PaymentResponse { paymentLink?: unknown; expiresAt?: unknown; }
export interface SubscriptionRow { plan?: unknown; tier?: unknown; status?: unknown; current_period_end?: unknown; }
export type Prices = Record<Plan, number>;

// Цена перехода на «Навсегда» для действующей годовой подписки живёт в
// premium_pricing строкой lifetime_annual. Сервер применяет её сам; здесь она
// нужна только для того, чтобы кнопка показывала ту же сумму, что спишет банк.
export interface Pricing { prices: Prices; annualLifetimePrice: number; }

export const DEFAULT_PRICES: Prices = { monthly: 399, annual: 2990, lifetime: 6490 };
export const DEFAULT_ANNUAL_LIFETIME_PRICE = 3500;
export const DEFAULT_PRICING: Pricing = { prices: DEFAULT_PRICES, annualLifetimePrice: DEFAULT_ANNUAL_LIFETIME_PRICE };
export const LEGAL_DOCUMENT_VERSION = "2026-08-09";

/** Порядок кнопок тарифа на странице оплаты. */
export const PLAN_ORDER: readonly Plan[] = ["annual", "monthly", "lifetime"];

export function isPlan(value: unknown): value is Plan {
  return value === "monthly" || value === "annual" || value === "lifetime";
}

function lowercased(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}

// Те же условия, что и в tochka-payment: статус из разрешённого списка,
// tier premium и непросроченный период для годового тарифа.
const ACTIVE_STATUSES = ["active", "paid", "premium", "trialing"];

function isActivePremium(subscription: SubscriptionRow | null, plan: Plan): boolean {
  return lowercased(subscription?.plan) === plan &&
    lowercased(subscription?.tier) === "premium" &&
    ACTIVE_STATUSES.includes(lowercased(subscription?.status) ?? "");
}

export function isActiveLifetimePremium(subscription: SubscriptionRow | null): boolean {
  return isActivePremium(subscription, "lifetime");
}

export function hasActiveAnnualPremium(subscription: SubscriptionRow | null): boolean {
  if (!isActivePremium(subscription, "annual")) return false;
  const periodEnd = typeof subscription?.current_period_end === "string" ? Date.parse(subscription.current_period_end) : Number.NaN;
  return Number.isFinite(periodEnd) && periodEnd > Date.now();
}

/** Сумма, которую спишет банк за выбранный тариф. */
export function planAmount(plan: Plan, pricing: Pricing, subscription: SubscriptionRow | null): number {
  if (plan !== "lifetime" || !hasActiveAnnualPremium(subscription)) return pricing.prices[plan];
  const upgrade = pricing.annualLifetimePrice;
  return upgrade > 0 && upgrade < pricing.prices.lifetime ? upgrade : pricing.prices.lifetime;
}

export function formatRub(amount: number): string {
  return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
}

// Вход по коду живёт в текущей вкладке, пока не истёк access token: вернувшись
// со страницы банка, человек сразу видит тарифы и может оплатить ещё раз, а не
// запрашивает код заново. Так же ведёт себя приложение — оно не разлогинивает
// после открытия оплаты.
export interface CheckoutSession { email: string; accessToken: string; expiresAt: number; }

/** Ссылка «Точки», которую уже открывали: живёт до `expiresAt`, иначе 30 минут с создания. */
export interface PendingCheckout { plan: Plan; paymentLink: string; createdAt: number; expiresAt?: string | null; }

export const PENDING_CHECKOUT_FALLBACK_TTL_MS = 30 * 60_000;
export const SESSION_FALLBACK_TTL_MS = 60 * 60_000;

export function pendingCheckoutDeadline(pending: Pick<PendingCheckout, "expiresAt" | "createdAt">): number {
  const expiry = pending.expiresAt ? Date.parse(pending.expiresAt) : Number.NaN;
  return Number.isFinite(expiry) ? expiry : pending.createdAt + PENDING_CHECKOUT_FALLBACK_TTL_MS;
}

export function isPendingCheckoutActive(pending: Pick<PendingCheckout, "expiresAt" | "createdAt">, now = Date.now()): boolean {
  return now < pendingCheckoutDeadline(pending);
}

export function isCheckoutSessionActive(session: Pick<CheckoutSession, "expiresAt">, now = Date.now()): boolean {
  return Number.isFinite(session.expiresAt) && now < session.expiresAt;
}

/** Момент истечения токена из ответа GoTrue: `expires_at` в секундах, иначе `expires_in`, иначе час. */
export function sessionExpiry(result: VerifyResponse, now = Date.now()): number {
  if (typeof result.expires_at === "number" && Number.isFinite(result.expires_at)) return result.expires_at * 1000;
  if (typeof result.expires_in === "number" && Number.isFinite(result.expires_in)) return now + result.expires_in * 1000;
  return now + SESSION_FALLBACK_TTL_MS;
}

export function decodeCheckoutSession(value: unknown): CheckoutSession | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.email !== "string" || typeof row.accessToken !== "string" || typeof row.expiresAt !== "number") return null;
  const session = { email: row.email, accessToken: row.accessToken, expiresAt: row.expiresAt };
  return isCheckoutSessionActive(session) ? session : null;
}

export function decodePendingCheckout(value: unknown): PendingCheckout | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isPlan(row.plan) || typeof row.paymentLink !== "string" || typeof row.createdAt !== "number") return null;
  const pending: PendingCheckout = { plan: row.plan, paymentLink: row.paymentLink, createdAt: row.createdAt, expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : null };
  return isPendingCheckoutActive(pending) ? pending : null;
}
