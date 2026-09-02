export type Plan = "monthly" | "annual";
export type PaymentStep = "email" | "code" | "plan" | "redirect";

export interface PricingRow { plan?: unknown; amount?: unknown; currency?: unknown; }
export interface VerifyResponse { access_token?: unknown; }
export interface PaymentResponse { paymentLink?: unknown; }
export type Prices = Record<Plan, number>;

export const DEFAULT_PRICES: Prices = { monthly: 399, annual: 2990 };
export const LEGAL_DOCUMENT_VERSION = "2026-08-09";

export function isPlan(value: unknown): value is Plan {
  return value === "monthly" || value === "annual";
}

export function formatRub(amount: number): string {
  return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
}
