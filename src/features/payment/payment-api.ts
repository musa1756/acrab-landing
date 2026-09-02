import { DEFAULT_PRICES, isPlan, LEGAL_DOCUMENT_VERSION, type PaymentResponse, type Plan, type Prices, type PricingRow, type VerifyResponse } from "./payment-model";

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

export async function loadPrices(): Promise<Prices> {
  const prices: Prices = { ...DEFAULT_PRICES };
  try {
    const rows = await supabaseFetch<PricingRow[]>("/rest/v1/premium_pricing?select=plan,amount,currency");
    if (Array.isArray(rows)) for (const row of rows) {
      if (row.currency === "RUB" && isPlan(row.plan) && typeof row.amount === "number" && Number.isFinite(row.amount) && row.amount >= 0) prices[row.plan] = row.amount;
    }
  } catch { /* keep hard-coded fallback prices */ }
  return prices;
}

export function isTrustedPaymentLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const link = new URL(value);
    return link.protocol === "https:" && (link.hostname === "tochka.com" || link.hostname.endsWith(".tochka.com"));
  } catch { return false; }
}

export async function createPayment(accessToken: string, plan: Plan): Promise<string> {
  const result = await supabaseFetch<PaymentResponse>("/functions/v1/tochka-payment", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: "create", plan, legalAcceptance: { offerVersion: LEGAL_DOCUMENT_VERSION, personalDataConsentVersion: LEGAL_DOCUMENT_VERSION, source: "web-checkout" } }),
  });
  if (!result || !isTrustedPaymentLink(result.paymentLink)) throw new PaymentApiError("Missing or untrusted paymentLink", 500);
  return result.paymentLink;
}
