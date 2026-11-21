import { afterEach, describe, expect, test } from "bun:test";
import {
  buildCreatePaymentBody,
  checkPromoCode,
  createPayment,
  PaymentApiError,
} from "../src/features/payment/payment-api";
import { checkPromoErrorMessage, promoCodeErrorMessage } from "../src/features/payment/payment-messages";
import {
  decodePromoCheckResponse,
  DEFAULT_PRICING,
  discountedAmount,
  effectivePlanAmount,
  hasLifetimeUpgrade,
  isBloggerPromoCode,
  isFriendPromoCode,
  isValidPromoCodeFormat,
  normalizePromoCodeInput,
} from "../src/features/payment/payment-model";
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  resolveStoreRedirect,
  RUSTORE_URL,
  storeTarget,
} from "../src/scripts/store-redirect-model";
import {
  buildGooglePlayReferrer,
  buildSiteTrackPayload,
  decodeTrafficAttribution,
  decorateStoreUrl,
  extractExternalRefererHost,
  isUuid,
  mergeTrafficAttribution,
  parseTrafficSearch,
  storeKindFromHref,
  toPaymentAttribution,
} from "../src/scripts/traffic-attribution";

const SAMPLE_UUID = "11111111-2222-4333-8444-555555555555";
const OTHER_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("traffic attribution", () => {
  test("parses UTM, click_id, slug and promo from URL search", () => {
    const parsed = parseTrafficSearch(
      `?utm_source=instagram&utm_medium=reels&utm_campaign=ramadan2026&utm_content=hook1&click_id=${SAMPLE_UUID.toUpperCase()}&slug=Blog_01&promo=  ali_20! `,
    );
    expect(parsed).toEqual({
      utmSource: "instagram",
      utmMedium: "reels",
      utmCampaign: "ramadan2026",
      utmContent: "hook1",
      clickId: SAMPLE_UUID,
      slug: "blog_01",
      promo: "ALI_20",
    });
  });

  test("ignores invalid click_id and slug in URL search", () => {
    const parsed = parseTrafficSearch("?click_id=not-a-uuid&slug=-bad&utm_source=tg");
    expect(parsed).toEqual({ utmSource: "tg" });
    expect(isUuid(SAMPLE_UUID)).toBe(true);
    expect(isUuid("12345")).toBe(false);
  });

  test("extracts external referer host and ignores acrab.ru self-referrals", () => {
    expect(extractExternalRefererHost("https://t.me/musa1756_ai/123")).toBe("t.me");
    expect(extractExternalRefererHost("https://www.instagram.com/reel/abc")).toBe("www.instagram.com");
    expect(extractExternalRefererHost("https://acrab.ru/articles/")).toBeUndefined();
    expect(extractExternalRefererHost("https://go.acrab.ru/slug")).toBeUndefined();
    expect(extractExternalRefererHost("http://localhost:4321/buy/", "localhost")).toBeUndefined();
    expect(extractExternalRefererHost("javascript:alert(1)")).toBeUndefined();
    expect(extractExternalRefererHost("")).toBeUndefined();
  });

  test("preserves first-touch attribution across internal navigation and updates on new campaign", () => {
    const first = mergeTrafficAttribution(
      null,
      parseTrafficSearch("?utm_source=instagram&utm_campaign=reel1&promo=ALI20"),
      "instagram.com",
      () => SAMPLE_UUID,
    );
    expect(first.isFreshLanding).toBe(true);
    expect(first.attribution).toEqual({
      clickId: SAMPLE_UUID,
      utmSource: "instagram",
      utmCampaign: "reel1",
      promo: "ALI20",
      refererHost: "instagram.com",
    });

    // Внутренний переход без UTM сохраняет first-touch.
    const internal = mergeTrafficAttribution(first.attribution, {}, undefined, () => OTHER_UUID);
    expect(internal.isFreshLanding).toBe(false);
    expect(internal.attribution).toEqual(first.attribution);

    // Новый рекламный клик с другим utm_source обновляет кампанию и click_id.
    const second = mergeTrafficAttribution(
      first.attribution,
      parseTrafficSearch(`?utm_source=telegram&utm_campaign=channel_post&click_id=${OTHER_UUID}`),
      "t.me",
    );
    expect(second.isFreshLanding).toBe(true);
    expect(second.attribution).toEqual({
      clickId: OTHER_UUID,
      utmSource: "telegram",
      utmCampaign: "channel_post",
      promo: "ALI20",
      refererHost: "t.me",
    });
  });

  test("decodes stored attribution safely", () => {
    expect(decodeTrafficAttribution({ clickId: SAMPLE_UUID, utmSource: "tg", slug: "s1", promo: "ali20" })).toEqual({
      clickId: SAMPLE_UUID,
      utmSource: "tg",
      slug: "s1",
      promo: "ALI20",
    });
    expect(decodeTrafficAttribution({ clickId: "bad" })).toBeNull();
    expect(decodeTrafficAttribution(null)).toBeNull();
  });

  test("decorates Google Play and App Store URLs idempotently while leaving RuStore untouched", () => {
    const attribution = {
      clickId: SAMPLE_UUID,
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "reel_01",
      utmContent: "bio",
      slug: "ig_bio",
    };

    const playOnce = decorateStoreUrl(GOOGLE_PLAY_URL, attribution);
    const playTwice = decorateStoreUrl(playOnce, attribution);
    expect(playTwice).toBe(playOnce);
    const playUrl = new URL(playOnce);
    expect(playUrl.searchParams.get("id")).toBe("com.acrab.arabic");
    const referrerParams = new URLSearchParams(playUrl.searchParams.get("referrer") || "");
    expect(referrerParams.get("utm_source")).toBe("instagram");
    expect(referrerParams.get("utm_medium")).toBe("social");
    expect(referrerParams.get("utm_campaign")).toBe("reel_01");
    expect(referrerParams.get("utm_content")).toBe("bio");
    expect(referrerParams.get("click_id")).toBe(SAMPLE_UUID);

    // Fallback utm_campaign на slug, если utmCampaign отсутствует.
    const slugReferrer = buildGooglePlayReferrer({ slug: "blogger1", clickId: SAMPLE_UUID });
    expect(new URLSearchParams(slugReferrer || "").get("utm_campaign")).toBe("blogger1");

    const appleOnce = decorateStoreUrl(APP_STORE_URL, attribution);
    const appleTwice = decorateStoreUrl(appleOnce, attribution);
    expect(appleTwice).toBe(appleOnce);
    const appleUrl = new URL(appleOnce);
    expect(appleUrl.searchParams.get("ct")).toBe("reel_01");
    expect(appleUrl.searchParams.get("mt")).toBe("8");

    // Без campaign/slug ссылка App Store не засоряется параметрами.
    expect(decorateStoreUrl(APP_STORE_URL, { clickId: SAMPLE_UUID })).toBe(APP_STORE_URL);
    // RuStore не меняется.
    expect(decorateStoreUrl(RUSTORE_URL, attribution)).toBe(RUSTORE_URL);
  });

  test("identifies store hosts and builds compact beacon and payment payloads", () => {
    expect(storeKindFromHref(APP_STORE_URL)).toBe("appstore");
    expect(storeKindFromHref(GOOGLE_PLAY_URL)).toBe("googleplay");
    expect(storeKindFromHref(RUSTORE_URL)).toBe("rustore");
    expect(storeKindFromHref("https://acrab.ru/buy/")).toBeNull();

    const attribution = {
      clickId: SAMPLE_UUID,
      utmSource: "youtube",
      utmCampaign: "review",
      slug: "yt1",
      refererHost: "youtube.com",
    };
    expect(buildSiteTrackPayload("store_click", attribution, { storeTarget: "googleplay", pagePath: "/get/" })).toEqual({
      click_id: SAMPLE_UUID,
      event_kind: "store_click",
      store_target: "googleplay",
      slug: "yt1",
      page_path: "/get/",
      utm_source: "youtube",
      utm_campaign: "review",
      referer_host: "youtube.com",
    });

    expect(toPaymentAttribution(attribution)).toEqual({
      utmSource: "youtube",
      utmCampaign: "review",
      clickId: SAMPLE_UUID,
      slug: "yt1",
    });
  });
});

describe("smart /get/ redirect", () => {
  test("supports ?store=rustore on Android", () => {
    const resolved = resolveStoreRedirect("Mozilla/5.0 Android 14", 0, { search: "?store=rustore&utm_source=vk" });
    expect(resolved).toEqual({ store: "rustore", url: RUSTORE_URL });
    expect(storeTarget("Mozilla/5.0 Android 14", 0, { search: "?store=rustore" })).toBe(RUSTORE_URL);
  });

  test("decorates Google Play and App Store redirects with query attribution", () => {
    const androidUrl = storeTarget("Mozilla/5.0 Android 14", 0, {
      search: `?utm_source=tg&utm_campaign=launch&click_id=${SAMPLE_UUID}`,
    });
    expect(androidUrl).toContain("play.google.com/store/apps/details?id=com.acrab.arabic");
    const parsedAndroid = new URL(androidUrl!);
    const inner = new URLSearchParams(parsedAndroid.searchParams.get("referrer") || "");
    expect(inner.get("utm_source")).toBe("tg");
    expect(inner.get("utm_campaign")).toBe("launch");
    expect(inner.get("click_id")).toBe(SAMPLE_UUID);

    const iosUrl = storeTarget("Mozilla/5.0 iPhone", 0, {
      search: "?slug=blogger_ali",
    });
    expect(iosUrl).toBe(`${APP_STORE_URL}?ct=blogger_ali&mt=8`);

    expect(storeTarget("Mozilla/5.0 Macintosh", 0, { search: "?store=rustore&slug=blogger_ali" })).toBeNull();
  });
});

describe("promo codes and payment checkout", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("validates disjoint friend numeric codes and blogger alphanumeric codes", () => {
    expect(normalizePromoCodeInput("  ali-2026! ")).toBe("ALI-2026");

    expect(isFriendPromoCode("123456")).toBe(true);
    expect(isFriendPromoCode("98765432")).toBe(true);
    expect(isFriendPromoCode("012345")).toBe(false);
    expect(isFriendPromoCode("12345")).toBe(false);
    expect(isFriendPromoCode("123456789")).toBe(false);

    expect(isBloggerPromoCode("ALI")).toBe(true);
    expect(isBloggerPromoCode("RAMADAN_2026")).toBe(true);
    expect(isBloggerPromoCode("A-1")).toBe(true);
    expect(isBloggerPromoCode("123456")).toBe(false);
    expect(isBloggerPromoCode("AB")).toBe(false);
    expect(isBloggerPromoCode("A".repeat(21))).toBe(false);

    expect(isValidPromoCodeFormat("123456")).toBe(true);
    expect(isValidPromoCodeFormat("BLOGGER20")).toBe(true);
    expect(isValidPromoCodeFormat("12")).toBe(false);
    expect(isValidPromoCodeFormat("012345")).toBe(false);
  });

  test("calculates exact floored RUB discounts and skips annual-to-lifetime upgrade", () => {
    expect(discountedAmount(399, 15)).toBe(339);
    expect(discountedAmount(2990, 15)).toBe(2541);
    expect(discountedAmount(6490, 15)).toBe(5516);
    expect(discountedAmount(2990, 20)).toBe(2392);
    expect(discountedAmount(6490, 30)).toBe(4543);

    const blogger20 = { code: "BLOGGER20", discountPercent: 20, kind: "blogger" as const };
    expect(effectivePlanAmount("monthly", DEFAULT_PRICING, null, blogger20)).toBe(319);
    expect(effectivePlanAmount("annual", DEFAULT_PRICING, null, blogger20)).toBe(2392);
    expect(effectivePlanAmount("lifetime", DEFAULT_PRICING, null, blogger20)).toBe(5192);

    const activeAnnual = {
      plan: "annual",
      tier: "premium",
      status: "active",
      current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
    };
    expect(hasLifetimeUpgrade(DEFAULT_PRICING, activeAnnual)).toBe(true);
    // При активном льготном переходе за 3 500 ₽ промокод не суммируется.
    expect(effectivePlanAmount("lifetime", DEFAULT_PRICING, activeAnnual, blogger20)).toBe(3500);
    expect(effectivePlanAmount("annual", DEFAULT_PRICING, activeAnnual, blogger20)).toBe(2990);
  });

  test("decodes check_promo_code RPC responses and maps canonical Russian messages", () => {
    expect(
      decodePromoCheckResponse(
        { status: "ok", kind: "blogger", code: "ALI20", discount_percent: 20 },
        "ali20",
      ),
    ).toEqual({
      status: "ok",
      kind: "blogger",
      code: "ALI20",
      discountPercent: 20,
    });

    expect(
      decodePromoCheckResponse(
        { status: "expired", kind: "blogger", code: "OLD20", discount_percent: null },
        "old20",
      ),
    ).toEqual({
      status: "expired",
      kind: "blogger",
      code: "OLD20",
      discountPercent: null,
    });

    expect(decodePromoCheckResponse(null, "bad")).toEqual({
      status: "invalid",
      kind: null,
      code: "BAD",
      discountPercent: null,
    });

    expect(promoCodeErrorMessage("invalid")).toBe("Такого промокода нет. Проверьте код.");
    expect(promoCodeErrorMessage("expired")).toBe("Срок действия этого промокода истёк или лимит исчерпан.");
    expect(promoCodeErrorMessage("own")).toContain("нельзя применить");
    expect(promoCodeErrorMessage("not_eligible")).toContain("только на первую покупку");
    expect(checkPromoErrorMessage(new PaymentApiError("network"))).toContain("Проверьте связь");
  });

  test("builds createPayment payload with promoCode, referralCode and attribution", () => {
    const withAll = buildCreatePaymentBody("annual", {
      promoCode: "  ali20 ",
      attribution: {
        utmSource: "instagram",
        utmMedium: "reels",
        utmCampaign: "spring",
        utmContent: "v1",
        clickId: SAMPLE_UUID,
        slug: "ali",
      },
    });
    expect(withAll.promoCode).toBe("ALI20");
    expect(withAll.referralCode).toBe("ALI20");
    expect(withAll.attribution).toEqual({
      utmSource: "instagram",
      utmMedium: "reels",
      utmCampaign: "spring",
      utmContent: "v1",
      clickId: SAMPLE_UUID,
      slug: "ali",
    });

    const plain = buildCreatePaymentBody("monthly");
    expect(plain.promoCode).toBeUndefined();
    expect(plain.referralCode).toBeUndefined();
    expect(plain.attribution).toBeUndefined();
  });

  test("calls check_promo_code RPC and tochka-payment with proper auth headers and 422 handling", async () => {
    const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const headers = new Headers(init?.headers);
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      calls.push({ url, headers, body });

      if (url.endsWith("/rest/v1/rpc/check_promo_code")) {
        return new Response(
          JSON.stringify({ status: "ok", kind: "blogger", code: "ALI25", discount_percent: 25 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Срок действия этого промокода истёк или лимит исчерпан." }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const checked = await checkPromoCode("ali25", "jwt-token-123");
    expect(checked).toEqual({ status: "ok", kind: "blogger", code: "ALI25", discountPercent: 25 });
    expect(calls[0]!.url).toBe("https://api.acrab.ru/rest/v1/rpc/check_promo_code");
    expect(calls[0]!.headers.get("Authorization")).toBe("Bearer jwt-token-123");
    expect(calls[0]!.headers.get("apikey")).toBeTruthy();
    expect(calls[0]!.body).toEqual({ p_code: "ALI25" });

    // Anonymous check omits Authorization header.
    await checkPromoCode("123456", null);
    expect(calls[1]!.headers.get("Authorization")).toBeNull();

    // 422 from tochka-payment preserves status & Russian message.
    try {
      await createPayment("jwt-token-123", "annual", {
        promoCode: "ALI25",
        attribution: { utmSource: "ig", clickId: SAMPLE_UUID },
      });
      expect.unreachable("Expected 422 error");
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentApiError);
      expect((error as PaymentApiError).status).toBe(422);
      expect((error as PaymentApiError).message).toBe("Срок действия этого промокода истёк или лимит исчерпан.");
    }
    expect(calls[2]!.body).toMatchObject({
      action: "create",
      plan: "annual",
      promoCode: "ALI25",
      referralCode: "ALI25",
      attribution: { utmSource: "ig", clickId: SAMPLE_UUID },
    });
  });
});
