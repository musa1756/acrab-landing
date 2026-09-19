export type Plan = "monthly" | "annual" | "lifetime";
export type PaymentStep = "email" | "code" | "plan" | "redirect";

export interface PricingRow { plan?: unknown; amount?: unknown; currency?: unknown; }
export interface VerifyResponse { access_token?: unknown; }
export interface PaymentResponse { paymentLink?: unknown; }
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
