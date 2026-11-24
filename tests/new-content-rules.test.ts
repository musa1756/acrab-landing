import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../src/lib/routes";
import {
  NEW_GUIDES,
  NEW_GUIDES_LASTMOD,
  NEW_GUIDE_CHECK_SITE_ROUTES,
  NEW_GUIDE_CHECK_SITE_SLUGS,
  NEW_GUIDE_LLMS_BULLETS,
  NEW_GUIDE_ROUTES,
} from "../src/data/new-guides-manifest";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");
const plain = (text: string) => text.replace(/&nbsp;|[\u00a0\u202f]/g, " ");

const pages = NEW_GUIDE_ROUTES.map((route) => ({
  route,
  source: read(route.source),
}));

const tapScript = read("src/scripts/tap-preview.ts");
const manifestSource = read("src/data/new-guides-manifest.ts");

describe("new SEO guide manifest", () => {
  test("declares all 8 new guide routes consistently across manifest exports", () => {
    expect(NEW_GUIDE_ROUTES).toHaveLength(8);
    expect(NEW_GUIDES).toHaveLength(8);
    expect(NEW_GUIDE_LLMS_BULLETS).toHaveLength(8);
    expect(NEW_GUIDE_CHECK_SITE_SLUGS).toHaveLength(8);
    expect(Object.keys(NEW_GUIDE_CHECK_SITE_ROUTES)).toHaveLength(8);

    const routePaths = NEW_GUIDE_ROUTES.map((item) => item.path);
    expect(NEW_GUIDES.map((item) => item.href)).toEqual(routePaths);

    for (let i = 0; i < NEW_GUIDE_ROUTES.length; i += 1) {
      const route = NEW_GUIDE_ROUTES[i]!;
      const slug = NEW_GUIDE_CHECK_SITE_SLUGS[i]!;
      expect(route.indexable).toBe(true);
      expect(route.section).toBe("articles");
      expect(route.guide).toBe(true);
      expect(route.lastmod).toBe(NEW_GUIDES_LASTMOD);
      expect(slug).toBe(route.path.slice(0, -1));
      expect(NEW_GUIDE_CHECK_SITE_ROUTES[slug]).toBe(`${slug.slice(1)}/index.html`);
      expect(NEW_GUIDE_LLMS_BULLETS[i]).toContain(`https://acrab.ru${route.path}`);
      expect(existsSync(resolve(root, route.source)), route.source).toBe(true);
    }
  });
});

describe("Arabic & Islamic canon rules (docs/ARABIC_RULES.md)", () => {
  test("never uses Cyrillic «Аллах» or forbidden «Всевышний» anywhere in new content", () => {
    const targets: [string, string][] = [
      ...pages.map(({ route, source }): [string, string] => [route.source, source]),
      ["src/data/new-guides-manifest.ts", manifestSource],
      ["src/scripts/tap-preview.ts", tapScript],
    ];
    for (const [label, text] of targets) {
      expect(text, `${label}: Cyrillic Аллах`).not.toMatch(/аллах/iu);
      expect(text, `${label}: Всевышний`).not.toMatch(/всевышн/iu);
    }
  });

  test("writes Arabic اللَّه / لِلَّهِ with shadda+fatha and zero superscript alif (\\u0670)", () => {
    for (const { route, source } of pages) {
      // Нигде в имени Аллаhа не должно быть надстрочного алифа \u0670.
      expect(source, `${route.path}: \\u0670 in Allah`).not.toMatch(/ل[\u064b-\u065f\u0670]*ل[\u064b-\u065f\u0670]*\u0670[\u064b-\u065f]*ه/);
      // И не должно быть формы «الله» без шадды+фатхи на второй лям.
      const bareAllah = source.match(/(?:^|[^\u0621-\u064a])(?:ا|لِ)ل[\u064b-\u065f]*ه[\u064b-\u065f]*/g) ?? [];
      for (const token of bareAllah) {
        const trimmed = token.replace(/^[^\u0621-\u064a]+/, "");
        expect(trimmed, `${route.path}: ${trimmed}`).toMatch(/^(?:اللَّه[َُِ]|لِلَّهِ)$/);
      }
    }
  });

  test("contains zero forbidden calques from ARABIC_RULES.md §3.8", () => {
    const forbidden = [
      /كَمْ\s+يُكَلِّفُ/,
      /يَقُومُ\s+بِ/,
      /بِشَكْلٍ/,
      /طُولَ\s+اللَّيْلِ/,
      /بِبُطْءٍ\s+أَكْبَرَ/,
    ];
    for (const { route, source } of pages) {
      for (const pattern of forbidden) {
        expect(source, `${route.path}: ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  test("preserves mandatory verbatim Russian Islamic formulas in islamic-phrases", () => {
    const islamic = read("src/pages/islamic-phrases/index.astro");
    const requiredFormulas = [
      "если хотел Аллаh",
      "Так хотел Аллаh",
      "Начинаю с Именем Аллаhа",
      "Хвала Аллаhу",
      "пречист Аллаh от всех недостатков",
      "Прошу прощения у Аллаhа",
      "Да благословит тебя Аллаh",
      "Пусть Аллаh воздаст тебе добром",
      "мир ему",
      "ﷺ",
    ];
    for (const formula of requiredFormulas) {
      expect(islamic, formula).toContain(formula);
    }
  });

  test("preserves authentic excerpt & author translations in qiraa-rashida", () => {
    const qiraa = read("src/pages/qiraa-rashida/index.astro");
    expect(qiraa).toContain("Я рано ложусь спать и рано встаю утром");
    expect(qiraa).toContain("Просыпаюсь с именем Аллаhа и поминанием Его");
    expect(qiraa).toContain("أَسْتَيْقِظُ");
    expect(qiraa).toContain("اللَّهِ");
    expect(qiraa).toContain("tap-preview.ts");
  });

  test("uses accurate numeral agreement and natural travel phrases", () => {
    const numbers = read("src/pages/arabic-numbers/index.astro");
    expect(numbers).toContain("ثَلَاثَةُ كُتُبٍ");
    expect(numbers).toContain("اثْنَا عَشَرَ كِتَابًا");
    expect(numbers).toContain("اثْنَتَا عَشْرَةَ سَيَّارَةً");
    expect(numbers).toContain("مِائَةُ كِتَابٍ");

    const travel = read("src/pages/arabic-travel-phrases/index.astro");
    expect(travel).toContain("بِكَمْ هَذَا؟");
    expect(travel).toContain("ذَهَابًا وَإِيَابًا");
    expect(travel).toContain("بِتَمَهُّلٍ");
  });
});

describe("CSP, SEO metadata, assets, and program-numbers guardrails", () => {
  test("contains zero inline style attributes across all new pages and scripts", () => {
    for (const { route, source } of pages) {
      expect(source, `${route.path}: inline style`).not.toMatch(/\bstyle\s*=/i);
    }
    expect(tapScript, "tap-preview.ts inline style").not.toMatch(/\.style\b|setAttribute\(\s*["']style["']/);
  });

  test("has unique titles (<=68 chars) and descriptions (120-160 chars) not colliding with existing routes", () => {
    const newPaths = new Set(NEW_GUIDE_ROUTES.map((item) => item.path));
    const existingTitles = new Set<string>();
    const existingDescriptions = new Set<string>();
    for (const route of ROUTES.filter((item) => item.indexable && !newPaths.has(item.path))) {
      const src = read(route.source);
      const t = src.match(/(?:title|"title")\s*[:=]\s*["`]([^"`]+)["`]/)?.[1];
      const d = src.match(/(?:description|"description")\s*[:=]\s*["`]([^"`]+)["`]/)?.[1];
      if (t) existingTitles.add(t);
      if (d) existingDescriptions.add(d);
    }

    const seenTitles = new Set<string>();
    const seenDescriptions = new Set<string>();

    for (const { route, source } of pages) {
      const title = source.match(/"title"\s*:\s*"([^"]+)"/)?.[1];
      const description = source.match(/"description"\s*:\s*"([^"]+)"/)?.[1];
      expect(title, `${route.path} title`).toBeTruthy();
      expect(description, `${route.path} description`).toBeTruthy();
      expect(title!.length, `${route.path} title len (${title!.length}): ${title}`).toBeLessThanOrEqual(68);
      expect(description!.length, `${route.path} desc len (${description!.length}): ${description}`).toBeGreaterThanOrEqual(120);
      expect(description!.length, `${route.path} desc len (${description!.length}): ${description}`).toBeLessThanOrEqual(160);

      expect(existingTitles.has(title!), `${route.path} title collides with existing page`).toBe(false);
      expect(existingDescriptions.has(description!), `${route.path} description collides with existing page`).toBe(false);
      expect(seenTitles.has(title!), `${route.path} duplicate title`).toBe(false);
      expect(seenDescriptions.has(description!), `${route.path} duplicate description`).toBe(false);
      seenTitles.add(title!);
      seenDescriptions.add(description!);
    }
  });

  test("includes required GuideLayout structure, GEO answer card, TOC, tables, 2 CTAs, FAQ (4-6), and related links", () => {
    for (const { route, source } of pages) {
      expect(source, `${route.path} GuideLayout`).toContain("<GuideLayout");
      expect(source, `${route.path} guide.path`).toContain(`path: "${route.path}"`);
      expect(source, `${route.path} datePublished`).toContain('datePublished: "2026-11-24"');
      expect(source, `${route.path} dateModified`).toContain('dateModified: "2026-11-24"');
      expect(source, `${route.path} .guide-answer`).toContain('class="guide-answer card"');
      expect(source, `${route.path} Коротко:`).toContain("<strong>Коротко:</strong>");
      expect(source, `${route.path} .guide-toc`).toContain('class="guide-toc"');
      expect(source, `${route.path} native table`).toContain('<table class="guide-table">');
      expect(source, `${route.path} RTL Arabic`).toContain('lang="ar" dir="rtl"');
      expect(source, `${route.path} mid-article CTA`).toContain('href="/get/"');
      expect(source, `${route.path} bottom GuideCta`).toContain("<GuideCta ");
      expect(source, `${route.path} GuideFaq`).toContain("<GuideFaq ");
      expect(source, `${route.path} related-guides`).toContain('class="related-guides"');

      const questionCount = [...source.matchAll(/\bquestion:\s*"/g)].length;
      expect(questionCount, `${route.path} FAQ count`).toBeGreaterThanOrEqual(4);
      expect(questionCount, `${route.path} FAQ count`).toBeLessThanOrEqual(6);
    }
  });

  test("references only existing bundled audio and image assets", () => {
    for (const { route, source } of pages) {
      const audioMatches = [
        ...source.matchAll(/(?:AudioButton[^>]*src=|audio:\s*|data-audio=)"(\/assets\/audio\/[^"]+)"/g),
      ].map((match) => match[1]!);

      for (const audioPath of audioMatches) {
        const full = resolve(root, `public${audioPath}`);
        expect(existsSync(full), `${route.path} missing audio ${audioPath}`).toBe(true);
        expect(statSync(full).size, `${route.path} empty audio ${audioPath}`).toBeGreaterThan(1000);
      }

      const imageMatches = [
        ...source.matchAll(/(?:https:\/\/acrab\.ru)?(\/assets\/about\/[a-z0-9-]+\.webp)/g),
      ].map((match) => match[1]!);

      expect(imageMatches.length, `${route.path} ogImage/asset`).toBeGreaterThan(0);
      for (const imagePath of imageMatches) {
        const full = resolve(root, `public${imagePath}`);
        expect(existsSync(full), `${route.path} missing image ${imagePath}`).toBe(true);
      }
    }
  });

  test("contains zero arbitrary <N> уроков/модулей/глав numbers (website-facts invariant)", () => {
    const targets: [string, string][] = [
      ...pages.map(({ route, source }): [string, string] => [route.source, source]),
      ["src/data/new-guides-manifest.ts", manifestSource],
    ];
    for (const [label, text] of targets) {
      const matches = [...plain(text).matchAll(/(\d+|шесть|шести)\s+(глав|модул|урок)[а-я]*/gi)];
      expect(matches.map((m) => m[0]), `${label}: program-number regex hit`).toEqual([]);
    }
  });
});
