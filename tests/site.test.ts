import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTrustedPaymentLink, PaymentApiError } from "../src/features/payment/payment-api";
import { createPaymentErrorMessage, sendCodeErrorMessage, verifyCodeErrorMessage } from "../src/features/payment/payment-messages";
import { DEFAULT_PRICING, hasActiveAnnualPremium, isActiveLifetimePremium, planAmount, PLAN_ORDER } from "../src/features/payment/payment-model";
import { APP_STORE_URL, RU_STORE_URL, storeTarget } from "../src/scripts/store-redirect-model";

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
    for (const id of ["step-email", "email-input", "personal-data-consent", "send-code-btn", "step-code", "code-input", "verify-code-btn", "step-plan", "offer-consent", "pay-btn", "step-redirect"]) {
      expect(source, `#${id}`).toContain(`id="${id}"`);
    }
    expect(page).toContain("PaymentFlow client:load");
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

  test("allows only HTTPS Tochka payment links", () => {
    expect(isTrustedPaymentLink("https://tochka.com/pay")).toBe(true);
    expect(isTrustedPaymentLink("https://pay.tochka.com/pay")).toBe(true);
    expect(isTrustedPaymentLink("http://tochka.com/pay")).toBe(false);
    expect(isTrustedPaymentLink("https://tochka.com.evil.test/pay")).toBe(false);
    expect(isTrustedPaymentLink("/relative")).toBe(false);
    expect(isTrustedPaymentLink(null)).toBe(false);
  });
});

describe("store redirect", () => {
  test("redirects iOS and iPadOS to App Store", () => {
    expect(storeTarget("Mozilla iPhone", 0)).toBe(APP_STORE_URL);
    expect(storeTarget("Mozilla Macintosh", 2)).toBe(APP_STORE_URL);
  });

  test("redirects Android to RuStore and leaves desktop in place", () => {
    expect(storeTarget("Mozilla Android", 0)).toBe(RU_STORE_URL);
    expect(storeTarget("Mozilla Macintosh", 0)).toBeNull();
    expect(storeTarget("unknown", 0)).toBeNull();
  });
});
