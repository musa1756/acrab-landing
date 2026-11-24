import { describe, expect, test } from "bun:test";
import { highlightArabicLetter } from "../src/lib/rich-arabic";
import { resolvePageType } from "../src/scripts/analytics-goals";
import { encodeQrMatrix, renderQrSvg, rsEncode } from "../src/scripts/qr-svg";
import {
  buildOrganicCampaignTag,
  buildSiteTrackPayload,
  decodeTrafficAttribution,
  decorateStoreUrl,
  isUuid,
  mergeTrafficAttribution,
} from "../src/scripts/traffic-attribution";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "../src/scripts/store-redirect-model";
import {
  appSchema,
  audioObjectSchema,
  contactPageSchema,
  definedTermSchema,
  definedTermSetSchema,
  howToSchema,
  LOGO_URL,
  organizationSchema,
  webPageSchema,
} from "../src/seo/schema";
import { LETTERS, letterDescription, letterTitle } from "../src/seo/letters";
import { STORE_REVIEWS } from "../src/data/store-reviews";

const VALID_UUID = "11111111-2222-4333-8444-555555555555";

describe("QR SVG generator", () => {
  test("computes standard Reed-Solomon ECC bytes for Version 1-M test vector", () => {
    // Classic ISO/IEC 18004 RS check: single-byte message or deterministic non-zero ECC length
    const data = new Uint8Array([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
    const ec = rsEncode(data, 10);
    expect(ec).toHaveLength(10);
    // Known ISO/IEC 18004 Annex I Version 1-M "HELLO WORLD" RS remainder:
    expect(Array.from(ec)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  test("places finder patterns, timing patterns and dark module correctly", () => {
    const url = `https://acrab.ru/get/?utm_source=seo&click_id=${VALID_UUID}`;
    const matrix = encodeQrMatrix(url);
    expect(matrix.version).toBeGreaterThanOrEqual(4);
    expect(matrix.version).toBeLessThanOrEqual(10);
    expect(matrix.size).toBe(17 + matrix.version * 4);

    const at = (r: number, c: number) => matrix.modules[r * matrix.size + c];
    // Top-left finder 7x7 corners and center 3x3
    expect(at(0, 0)).toBe(1);
    expect(at(0, 6)).toBe(1);
    expect(at(6, 0)).toBe(1);
    expect(at(6, 6)).toBe(1);
    expect(at(1, 1)).toBe(0);
    expect(at(3, 3)).toBe(1);
    // Separator around top-left finder
    expect(at(7, 0)).toBe(0);
    expect(at(0, 7)).toBe(0);
    // Dark module always at (4*V + 9, 8) = (size - 8, 8)
    expect(at(matrix.size - 8, 8)).toBe(1);
    // Timing pattern alternates starting dark at (6, 8)
    expect(at(6, 8)).toBe(1);
    expect(at(6, 9)).toBe(0);
    expect(at(8, 6)).toBe(1);
    expect(at(9, 6)).toBe(0);
  });

  test("renders clean CSP-safe SVG without inline style attributes", () => {
    const svg = renderQrSvg("https://acrab.ru/get/?utm_source=tg&promo=ALI20");
    expect(svg).toStartWith("<svg ");
    expect(svg).toEndWith("</svg>");
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain("style=");
    expect(svg).toContain("<path ");
  });

  test("handles long attribution URLs up to Version 10 capacity", () => {
    const longUrl = `https://acrab.ru/get/?utm_source=instagram&utm_medium=reels&utm_campaign=ramadan_2026_launch&utm_content=hook_v3&click_id=${VALID_UUID}&slug=blogger_ali_01&promo=RAMADAN20`;
    const matrix = encodeQrMatrix(longUrl);
    expect(matrix.version).toBeLessThanOrEqual(10);
    expect(renderQrSvg(longUrl)).toContain("</svg>");
  });
});

describe("attribution and analytics upgrades", () => {
  test("enforces strict UUID v1-8 format", () => {
    expect(isUuid(VALID_UUID)).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isUuid("11111111-2222-9333-8444-555555555555")).toBe(false);
    expect(isUuid("11111111-2222-4333-0444-555555555555")).toBe(false);
  });

  test("persists firstLandingPath on first touch and emits organic seo_* ct tag", () => {
    const first = mergeTrafficAttribution(null, {}, "google.com", () => VALID_UUID, "/arabic-alphabet/");
    expect(first.attribution.firstLandingPath).toBe("/arabic-alphabet/");

    // Internal navigation does not overwrite firstLandingPath
    const next = mergeTrafficAttribution(first.attribution, {}, undefined, () => VALID_UUID, "/get/");
    expect(next.attribution.firstLandingPath).toBe("/arabic-alphabet/");

    expect(decodeTrafficAttribution(first.attribution)?.firstLandingPath).toBe("/arabic-alphabet/");
    expect(buildOrganicCampaignTag("/arabic-alphabet/ayn/")).toBe("seo_arabic_alphabet_ayn");
    expect(buildOrganicCampaignTag("/")).toBe("seo_home");

    const appleOrganic = new URL(decorateStoreUrl(APP_STORE_URL, first.attribution));
    expect(appleOrganic.searchParams.get("ct")).toBe("seo_arabic_alphabet");
    expect(appleOrganic.searchParams.get("mt")).toBe("8");
    expect(appleOrganic.searchParams.get("pt")).toBeNull();

    const appleWithPt = new URL(decorateStoreUrl(APP_STORE_URL, first.attribution, { providerToken: "128264449" }));
    expect(appleWithPt.searchParams.get("pt")).toBe("128264449");
    expect(appleWithPt.searchParams.get("ct")).toBe("seo_arabic_alphabet");

    const gpOrganic = new URL(decorateStoreUrl(GOOGLE_PLAY_URL, first.attribution));
    const ref = new URLSearchParams(gpOrganic.searchParams.get("referrer") || "");
    expect(ref.get("utm_campaign")).toBe("seo_arabic_alphabet");

    const payload = buildSiteTrackPayload("store_click", first.attribution, { storeTarget: "appstore", pagePath: "/get/" });
    expect(payload.first_landing_path).toBe("/arabic-alphabet/");
  });

  test("resolves page_type accurately across routes", () => {
    expect(resolvePageType("/")).toBe("home");
    expect(resolvePageType("/arabic-alphabet/")).toBe("guide");
    expect(resolvePageType("/arabic-alphabet/ayn/")).toBe("letter");
    expect(resolvePageType("/arabic-keyboard/")).toBe("keyboard");
    expect(resolvePageType("/articles/")).toBe("articles");
    expect(resolvePageType("/buy/")).toBe("buy");
    expect(resolvePageType("/get/")).toBe("get");
    expect(resolvePageType("/about/")).toBe("updates");
    expect(resolvePageType("/support/")).toBe("support");
    expect(resolvePageType("/privacy/")).toBe("legal");
  });
});

describe("SEO schema, letter metadata and Arabic highlight", () => {
  test("highlights target Arabic letter with diacritics and hamza carriers on alif", () => {
    expect(highlightArabicLetter("بَيْتٌ", "ب")).toBe('<span class="letter-mark">بَ</span>يْتٌ');
    expect(highlightArabicLetter("أَبٌ", "ا")).toBe('<span class="letter-mark">أَ</span>بٌ');
    expect(highlightArabicLetter("تَكْتُبُ", "ت")).toBe(
      '<span class="letter-mark">تَ</span>كْ<span class="letter-mark">تُ</span>بُ',
    );
  });

  test("keeps all 28 letter titles <= 70 chars and descriptions <= 165 chars", () => {
    for (const letter of LETTERS) {
      const title = letterTitle(letter);
      const desc = letterDescription(letter);
      expect(title.length, `${letter.slug} title: ${title}`).toBeLessThanOrEqual(70);
      expect(desc.length, `${letter.slug} desc: ${desc}`).toBeLessThanOrEqual(165);
    }
  });

  test("builds enriched Organization, MobileApplication and helper schemas", () => {
    expect(organizationSchema.alternateName).toEqual(["Акраб"]);
    expect(organizationSchema.legalName).toBe("ИП Лагуткин Максим Дмитриевич");

    expect(appSchema.image).toBe(LOGO_URL);
    expect(Array.isArray(appSchema.screenshot)).toBe(true);
    expect(Array.isArray(appSchema.offers)).toBe(true);
    expect((appSchema.offers as unknown[]).length).toBe(4);
    expect(Array.isArray(appSchema.review)).toBe(true);
    expect((appSchema.review as unknown[]).length).toBe(STORE_REVIEWS.length);
    expect(appSchema.aggregateRating).toBeUndefined();

    expect(contactPageSchema["@type"]).toBe("ContactPage");
    expect(
      webPageSchema({
        headline: "Тест",
        description: "Описание",
        path: "/arabic-keyboard/",
        image: LOGO_URL,
        datePublished: "2026-10-01",
        dateModified: "2026-11-24",
        crumbs: [],
      })["@type"],
    ).toBe("WebPage");
    expect(
      definedTermSetSchema({
        name: "Алфавит",
        description: "28 букв",
        path: "/arabic-alphabet/",
        terms: [{ name: "алиф", termCode: "ا", path: "/arabic-alphabet/alif/" }],
      })["@type"],
    ).toBe("DefinedTermSet");
    expect(
      definedTermSchema({
        name: "Буква ба",
        description: "Звук б",
        path: "/arabic-alphabet/ba/",
        termCode: "ب",
        inDefinedTermSetPath: "/arabic-alphabet/",
      })["@type"],
    ).toBe("DefinedTerm");
    expect(
      audioObjectSchema({ name: "Шукран", contentPath: "/assets/audio/shukran.mp3" })["@type"],
    ).toBe("AudioObject");
    expect(
      howToSchema({
        name: "План",
        description: "Шаги",
        path: "/learn-arabic/",
        steps: [{ name: "Шаг 1", text: "Текст" }],
      })["@type"],
    ).toBe("HowTo");
  });
});
