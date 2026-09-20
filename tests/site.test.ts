import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isSecurePaymentLink, PaymentApiError } from "../src/features/payment/payment-api";
import { createPaymentErrorMessage, sendCodeErrorMessage, verifyCodeErrorMessage } from "../src/features/payment/payment-messages";
import { DEFAULT_PRICING, decodeCheckoutSession, decodePendingCheckout, hasActiveAnnualPremium, isActiveLifetimePremium, isPendingCheckoutActive, planAmount, PLAN_ORDER, sessionExpiry } from "../src/features/payment/payment-model";
import { APP_STORE_URL, GOOGLE_PLAY_URL, storeTarget } from "../src/scripts/store-redirect-model";

const root = fileURLToPath(new URL("..", import.meta.url));
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

const sourceRoutes = {
  "/": "src/pages/index.astro",
  "/about": "src/pages/about/index.astro",
  "/learn-arabic": "src/pages/learn-arabic/index.astro",
  "/arabic-alphabet": "src/pages/arabic-alphabet/index.astro",
  "/fusha": "src/pages/fusha/index.astro",
  "/arabic-app": "src/pages/arabic-app/index.astro",
  "/buy": "src/pages/buy/index.astro",
  "/support": "src/pages/support/index.astro",
  "/privacy": "src/pages/privacy/index.astro",
  "/offer": "src/pages/offer/index.astro",
  "/consent": "src/pages/consent/index.astro",
  "/get": "src/pages/get/index.astro",
} as const;

const indexableRoutes = ["/", "/about", "/learn-arabic", "/arabic-alphabet", "/fusha", "/arabic-app", "/support", "/privacy"] as const;
const noindexRoutes = ["/buy", "/offer", "/consent", "/get"] as const;

describe("generated site", () => {
  test("declares every required Astro route", () => {
    for (const [route, path] of Object.entries(sourceRoutes)) {
      expect(readSource(path), route).toBeTruthy();
    }
  });

  test("keeps unique SEO metadata on indexable source pages", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const route of indexableRoutes) {
      const source = readSource(sourceRoutes[route]);
      const title = source.match(/(?:title|"title")\s*[:=]\s*["`]([^"`]+)["`]/)?.[1];
      const description = source.match(/(?:description|"description")\s*[:=]\s*["`]([^"`]+)["`]/)?.[1];
      const canonical = source.match(/(?:canonical|"canonical")\s*[:=]\s*["`]([^"`]+)["`]/)?.[1];
      expect(title, `${route} title`).toBeTruthy();
      expect(description, `${route} description`).toBeTruthy();
      expect(canonical, `${route} canonical`).toBe(`https://acrab.ru${route === "/" ? "/" : `${route}/`}`);
      expect(titles.has(title!), `${route} title uniqueness`).toBe(false);
      expect(descriptions.has(description!), `${route} description uniqueness`).toBe(false);
      titles.add(title!);
      descriptions.add(description!);
      expect(source).not.toMatch(/robots\s*["`]?\s*[:=]\s*["`]\s*noindex/i);
    }
  });

  test("keeps service pages noindex and homepage application structured data", () => {
    for (const route of noindexRoutes) {
      expect(readSource(sourceRoutes[route]), route).toMatch(/robots\s*["`]?\s*[:=]\s*["`]\s*noindex/i);
    }
    const home = readSource(sourceRoutes["/"]);
    expect(home).toContain('type="application/ld+json"');
    expect(home).toContain('"@type":"MobileApplication"');
  });

  test("keeps payment shell controls for a browser smoke", () => {
    const page = readSource("src/pages/buy/index.astro");
    const source = readSource("src/features/payment/PaymentFlow.tsx");
    for (const id of ["step-email", "email-input", "personal-data-consent", "send-code-btn", "step-code", "code-input", "verify-code-btn", "step-plan", "change-account-btn", "pending-checkout", "open-pending-btn", "pay-btn"]) {
      expect(source, `#${id}`).toContain(`id="${id}"`);
    }
    expect(page).toContain("PaymentFlow client:load");
  });

  test("shows the plans before sign-in and asks for the email only to pay", () => {
    for (const path of ["src/features/payment/PaymentFlow.tsx", "buy/index.html"]) {
      const source = readSource(path);
      expect(source.indexOf('className="plan-picker"') >= 0 ? source.indexOf('className="plan-picker"') : source.indexOf('class="plan-picker"'), path).toBeLessThan(source.indexOf('id="step-email"'));
      expect(source, path).toContain("подтвердите почту аккаунта Acrab");
      expect(source, path).toContain('id="plan-required-note"');
    }
    for (const path of ["src/pages/buy/index.astro", "buy/index.html"]) {
      expect(readSource(path), path).toContain("Выберите тариф</h2>");
    }
  });

  test("agrees to the offer by pressing «Оплатить» instead of a checkbox", () => {
    for (const path of ["src/features/payment/PaymentFlow.tsx", "buy/index.html"]) {
      const source = readSource(path);
      expect(source, path).not.toContain('id="offer-consent"');
      expect(source, path).not.toContain('id="step-redirect"');
      expect(source, path).toContain("Нажимая «Оплатить», вы принимаете условия");
      expect(source, path).toContain('"pageshow"');
    }
    for (const path of ["src/features/payment/payment-storage.ts", "buy/index.html"]) {
      const source = readSource(path);
      expect(source, path).toContain("acrab.checkout.session");
      expect(source, path).toContain("acrab.checkout.pending");
      expect(source, path).toContain("sessionStorage");
    }
  });

  test("offers the same three plans on the published copy of /buy", () => {
    const published = readSource("buy/index.html");
    for (const plan of PLAN_ORDER) {
      expect(published, plan).toContain(`data-plan="${plan}"`);
      expect(published, plan).toContain(`id="price-${plan}"`);
    }
    expect(published).toContain("lifetime_annual");
    expect(published).toContain("/rest/v1/subscriptions?select=plan,tier,status,current_period_end&limit=1");
  });

  test("keeps payment API contracts and public configuration", () => {
    const source = readSource("src/features/payment/payment-api.ts");
    expect(source).toContain('const SUPABASE_URL = "https://api.acrab.ru"');
    expect(source).toContain('create_user: false');
    expect(source).toContain('action: "create"');
    expect(source).toContain('offerVersion: LEGAL_DOCUMENT_VERSION');
    expect(source.replace(/\/\/.*$/gm, "")).not.toContain('service_role');
    expect(source).not.toMatch(/action:\s*["']confirm/);
  });
});

describe("payment behavior", () => {
  test("preserves OTP error classes", () => {
    expect(sendCodeErrorMessage(Object.assign(new PaymentApiError(""), { status: 422 }))).toContain("Аккаунта Acrab");
    expect(sendCodeErrorMessage(Object.assign(new PaymentApiError(""), { status: 429 }))).toContain("Слишком много запросов");
    expect(sendCodeErrorMessage(Object.assign(new PaymentApiError(""), { status: 500 }))).toContain("на нашей стороне");
    expect(verifyCodeErrorMessage(new PaymentApiError("network"))).toContain("связаться с сервером");
  });

  test("prices the lifetime plan and its annual upgrade", () => {
    const pricing = DEFAULT_PRICING;
    const annual = { plan: "annual", tier: "premium", status: "active", current_period_end: new Date(Date.now() + 86_400_000).toISOString() };
    const expired = { ...annual, current_period_end: new Date(Date.now() - 86_400_000).toISOString() };
    expect(PLAN_ORDER).toEqual(["annual", "monthly", "lifetime"]);
    expect(planAmount("lifetime", pricing, null)).toBe(6490);
    expect(planAmount("lifetime", pricing, annual)).toBe(3500);
    expect(planAmount("lifetime", pricing, expired)).toBe(6490);
    expect(planAmount("annual", pricing, annual)).toBe(2990);
    expect(hasActiveAnnualPremium(annual)).toBe(true);
    expect(hasActiveAnnualPremium({ ...annual, status: "canceled" })).toBe(false);
    expect(isActiveLifetimePremium({ plan: "lifetime", tier: "premium", status: "paid" })).toBe(true);
    expect(isActiveLifetimePremium(annual)).toBe(false);
  });

  test("shows the server reason when a payment cannot be created", () => {
    expect(createPaymentErrorMessage(new PaymentApiError("network"))).toContain("временно недоступен");
    expect(createPaymentErrorMessage(new PaymentApiError("Unauthorized", 401))).toContain("Сессия входа истекла");
    expect(createPaymentErrorMessage(new PaymentApiError("Premium «Навсегда» уже активирован для этого аккаунта.", 409)))
      .toBe("Premium «Навсегда» уже активирован для этого аккаунта.");
    expect(createPaymentErrorMessage(new PaymentApiError("Unknown plan", 400))).toContain("ошибка 400");
  });

  test("accepts any HTTPS payment link without credentials, like the app", () => {
    expect(isSecurePaymentLink("https://tochka.com/pay")).toBe(true);
    expect(isSecurePaymentLink("https://merch.bank24.int/order/?uuid=1")).toBe(true);
    expect(isSecurePaymentLink("http://tochka.com/pay")).toBe(false);
    expect(isSecurePaymentLink("https://user:pass@tochka.com/pay")).toBe(false);
    expect(isSecurePaymentLink("/relative")).toBe(false);
    expect(isSecurePaymentLink(null)).toBe(false);
  });

  test("keeps the sign-in and the last payment link alive like the app's pending payment", () => {
    const now = Date.now();
    expect(sessionExpiry({ expires_at: 1_800_000_000 }, now)).toBe(1_800_000_000_000);
    expect(sessionExpiry({ expires_in: 3600 }, now)).toBe(now + 3_600_000);
    expect(sessionExpiry({}, now)).toBe(now + 3_600_000);
    expect(decodeCheckoutSession({ email: "a@b.c", accessToken: "t", expiresAt: now + 60_000 })).toEqual({ email: "a@b.c", accessToken: "t", expiresAt: now + 60_000 });
    expect(decodeCheckoutSession({ email: "a@b.c", accessToken: "t", expiresAt: now - 1 })).toBeNull();
    expect(decodeCheckoutSession({ email: "a@b.c" })).toBeNull();
    const pending = { plan: "annual" as const, paymentLink: "https://merch.bank24.int/order/?uuid=1", createdAt: now, expiresAt: null };
    expect(decodePendingCheckout(pending)).toEqual(pending);
    expect(isPendingCheckoutActive(pending, now + 29 * 60_000)).toBe(true);
    expect(isPendingCheckoutActive(pending, now + 31 * 60_000)).toBe(false);
    expect(isPendingCheckoutActive({ createdAt: now, expiresAt: new Date(now + 5 * 60_000).toISOString() }, now + 6 * 60_000)).toBe(false);
    expect(decodePendingCheckout({ ...pending, createdAt: now - 31 * 60_000 })).toBeNull();
    expect(decodePendingCheckout({ ...pending, plan: "weekly" })).toBeNull();
  });
});

describe("store redirect", () => {
  test("redirects iOS and iPadOS to App Store", () => {
    expect(storeTarget("Mozilla iPhone", 0)).toBe(APP_STORE_URL);
    expect(storeTarget("Mozilla Macintosh", 2)).toBe(APP_STORE_URL);
  });

  test("redirects Android to Google Play and leaves desktop in place", () => {
    expect(storeTarget("Mozilla Android", 0)).toBe(GOOGLE_PLAY_URL);
    expect(storeTarget("Mozilla Macintosh", 0)).toBeNull();
    expect(storeTarget("unknown", 0)).toBeNull();
  });
});
