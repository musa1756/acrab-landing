import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MINI_QUIZ_STEPS, miniQuizSummary } from "../src/data/mini-quiz-web";
import {
  PLACEMENT_LEVELS,
  PLACEMENT_QUESTIONS,
  PLACEMENT_SKILLS,
  evaluatePlacement,
  levelForScore,
} from "../src/data/placement-web";
import {
  WEB_VERBS,
  filterWebVerbs,
  normalizeArabicSearch,
  relatedVerbsFor,
  verbBySlug,
  verbDescription,
  verbPath,
  verbTitle,
} from "../src/data/verbs-web";
import {
  WEB_TOOL_GUIDES,
  WEB_TOOL_ROUTES,
  WEB_TOOLS_LLMS_ENTRIES,
  WEB_VERB_ROUTES,
  WEB_VERB_SLUGS,
} from "../src/data/web-tools-manifest";

const websiteRoot = fileURLToPath(new URL("..", import.meta.url));
const readWebsite = (rel: string) => readFileSync(resolve(websiteRoot, rel), "utf8");
const HARAKAT_RE = /[\u064B-\u0652]/u;
const DAGGER_ALIF_RE = /\u0670/u;

describe("placement test (/arabic-test/)", () => {
  test("contains 10 questions spanning all 5 skills with valid answer indices", () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(10);
    expect(PLACEMENT_SKILLS).toHaveLength(5);

    const skillCounts = new Map<string, number>();
    for (const q of PLACEMENT_QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(q.options.length);
      expect(q.explanation.length, q.id).toBeGreaterThan(10);
      skillCounts.set(q.skill, (skillCounts.get(q.skill) ?? 0) + 1);
    }

    for (const skill of PLACEMENT_SKILLS) {
      expect(skillCounts.get(skill.id), skill.id).toBe(2);
    }
  });

  test("maps scores 0..10 to the four Russian placement levels cleanly", () => {
    expect(PLACEMENT_LEVELS.map((l) => l.title)).toEqual([
      "С нуля",
      "Знакомы с буквами",
      "Читаете слова",
      "Базовая фусха",
    ]);

    expect(levelForScore(0).id).toBe("zero");
    expect(levelForScore(2).id).toBe("zero");
    expect(levelForScore(3).id).toBe("letters");
    expect(levelForScore(5).id).toBe("letters");
    expect(levelForScore(6).id).toBe("words");
    expect(levelForScore(7).id).toBe("words");
    expect(levelForScore(8).id).toBe("fusha");
    expect(levelForScore(10).id).toBe("fusha");
    expect(levelForScore(-5).id).toBe("zero");
    expect(levelForScore(99).id).toBe("fusha");
  });

  test("evaluates full answers and skill breakdown accurately", () => {
    const allRight = PLACEMENT_QUESTIONS.map((q) => q.correctIndex);
    const perfect = evaluatePlacement(allRight);
    expect(perfect.correct).toBe(10);
    expect(perfect.total).toBe(10);
    expect(perfect.percent).toBe(100);
    expect(perfect.level.id).toBe("fusha");
    expect(perfect.skills.every((s) => s.correct === 2 && s.total === 2)).toBe(true);

    const allWrong = PLACEMENT_QUESTIONS.map((q) => (q.correctIndex + 1) % q.options.length);
    const zero = evaluatePlacement(allWrong);
    expect(zero.correct).toBe(0);
    expect(zero.percent).toBe(0);
    expect(zero.level.id).toBe("zero");
    expect(zero.skills.every((s) => s.correct === 0 && s.total === 2)).toBe(true);

    const mixed = PLACEMENT_QUESTIONS.map((q, idx) => (idx < 6 ? q.correctIndex : null));
    const mid = evaluatePlacement(mixed);
    expect(mid.correct).toBe(6);
    expect(mid.level.id).toBe("words");
    expect(mid.skills[0]?.correct).toBe(2);
    expect(mid.skills[4]?.correct).toBe(0);
  });

  test("points every placement audio prompt at a real bundled audio file", () => {
    const audioQuestions = PLACEMENT_QUESTIONS.filter((q) => q.audioSrc);
    expect(audioQuestions.length).toBeGreaterThanOrEqual(4);
    for (const q of audioQuestions) {
      const fullPath = resolve(websiteRoot, `public${q.audioSrc}`);
      expect(statSync(fullPath).size, q.audioSrc).toBeGreaterThan(1000);
    }
  });
});

describe("Arabic verbs catalog (/arabic-verbs/)", () => {
  test("exports at least 50 curated verbs with unique ASCII slugs and Form I + II–X coverage", () => {
    expect(WEB_VERBS.length).toBeGreaterThanOrEqual(50);
    const slugs = WEB_VERBS.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(WEB_VERBS.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(/^[a-z]+$/);
      expect(verbBySlug(slug)?.slug).toBe(slug);
    }

    const forms = new Set(WEB_VERBS.map((v) => v.form));
    expect(forms.has(1)).toBe(true);
    expect([...forms].filter((f) => f > 1).length).toBeGreaterThanOrEqual(6);
  });

  test("guarantees full harakat, 14-row / 13-form tables, no dagger alif, and no Allah typos", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const verb of WEB_VERBS) {
      expect(verb.past).toHaveLength(14);
      expect(verb.present).toHaveLength(14);
      expect(verb.imperative).toHaveLength(6);

      // 2-е лицо дв. числа (أَنْتُمَا) совпадает для м/ж рода → 14 строк, 13 различающихся форм.
      expect(verb.past[3]?.pronoun, verb.slug).toBe("أَنْتُمَا");
      expect(verb.past[6]?.pronoun, verb.slug).toBe("أَنْتُمَا");
      expect(verb.past[3]?.form, verb.slug).toBe(verb.past[6]?.form);
      expect(verb.present[3]?.form, verb.slug).toBe(verb.present[6]?.form);
      expect(verb.imperative[1]?.form, verb.slug).toBe(verb.imperative[4]?.form);

      const allArabic = [
        verb.arabic,
        verb.present3m,
        verb.imperative2m,
        verb.masdar,
        ...verb.past.map((r) => r.form),
        ...verb.present.map((r) => r.form),
        ...verb.imperative.map((r) => r.form),
      ];

      for (const ar of allArabic) {
        expect(ar.trim().length, `${verb.slug}: empty form`).toBeGreaterThan(0);
        expect(HARAKAT_RE.test(ar), `${verb.slug}: missing harakat in ${ar}`).toBe(true);
        expect(DAGGER_ALIF_RE.test(ar), `${verb.slug}: dagger alif in ${ar}`).toBe(false);
      }

      const serialized = JSON.stringify(verb);
      expect(serialized, verb.slug).not.toMatch(/Аллах/i);

      const title = verbTitle(verb);
      const desc = verbDescription(verb);
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      expect(descriptions.has(desc), `duplicate desc ${desc}`).toBe(false);
      titles.add(title);
      descriptions.add(desc);
    }
  });

  test("filters verbs by Russian meaning, Arabic with/without harakat, root, and form", () => {
    expect(filterWebVerbs(WEB_VERBS, "писать").map((v) => v.slug)).toContain("kataba");
    expect(filterWebVerbs(WEB_VERBS, "كتب").map((v) => v.slug)).toContain("kataba");
    expect(filterWebVerbs(WEB_VERBS, "كَتَبَ").map((v) => v.slug)).toContain("kataba");
    expect(filterWebVerbs(WEB_VERBS, "يكتب").map((v) => v.slug)).toContain("kataba");
    expect(filterWebVerbs(WEB_VERBS, "ك ت ب").map((v) => v.slug)).toContain("kataba");
    expect(filterWebVerbs(WEB_VERBS, "учеба").map((v) => v.slug)).toContain("darasa");
    expect(normalizeArabicSearch("أَكَلَ")).toBe("اكل");

    const form1Only = filterWebVerbs(WEB_VERBS, "", "1");
    expect(form1Only.every((v) => v.form === 1)).toBe(true);
    const derivedOnly = filterWebVerbs(WEB_VERBS, "", "derived");
    expect(derivedOnly.every((v) => v.form > 1)).toBe(true);
    expect(form1Only.length + derivedOnly.length).toBe(WEB_VERBS.length);
  });

  test("returns unique related verbs prioritizing the same root", () => {
    const alima = verbBySlug("alima")!;
    const related = relatedVerbsFor(alima, 6);
    expect(related).toHaveLength(6);
    expect(related.some((v) => v.slug === "allama")).toBe(true);
    expect(related.some((v) => v.slug === "taallama")).toBe(true);
    expect(related.every((v) => v.slug !== alima.slug)).toBe(true);
    expect(new Set(related.map((v) => v.slug)).size).toBe(6);
  });
});

describe("AlphabetMiniQuiz widget", () => {
  test("has 4 valid steps and every referenced audio file exists on disk", () => {
    expect(MINI_QUIZ_STEPS).toHaveLength(4);
    for (const step of MINI_QUIZ_STEPS) {
      expect(step.options.length, step.id).toBeGreaterThanOrEqual(2);
      expect(step.correctIndex, step.id).toBeGreaterThanOrEqual(0);
      expect(step.correctIndex, step.id).toBeLessThan(step.options.length);
      if (step.audioSrc) {
        const fullPath = resolve(websiteRoot, `public${step.audioSrc}`);
        expect(statSync(fullPath).size, step.audioSrc).toBeGreaterThan(1000);
      }
    }
    expect(miniQuizSummary(4, 4)).toContain("без ошибок");
    expect(miniQuizSummary(3, 4)).toContain("Отличный старт");
    expect(miniQuizSummary(1, 4)).toContain("Хорошая разминка");
  });
});

describe("web-tools manifest and project guardrails", () => {
  test("exports complete routes, slugs, guides, and llms.txt entries", () => {
    expect(WEB_TOOL_ROUTES.map((r) => r.path)).toEqual(["/arabic-test/", "/arabic-verbs/"]);
    expect(WEB_VERB_SLUGS).toHaveLength(WEB_VERBS.length);
    expect(WEB_VERB_ROUTES).toEqual(WEB_VERBS.map((v) => verbPath(v.slug)));
    expect(WEB_TOOL_GUIDES).toHaveLength(2);
    expect(WEB_TOOLS_LLMS_ENTRIES.map((e) => e.url)).toEqual([
      "https://acrab.ru/arabic-test/",
      "https://acrab.ru/arabic-verbs/",
    ]);
  });

  test("enforces CSP (no inline styles), Arabic canon, and program-number guardrails across all new files", () => {
    const newAstroFiles = [
      "src/pages/arabic-test/index.astro",
      "src/pages/arabic-verbs/index.astro",
      "src/pages/arabic-verbs/[verb].astro",
      "src/components/AlphabetMiniQuiz.astro",
    ];
    const newScriptFiles = [
      "src/scripts/arabic-test.ts",
      "src/scripts/arabic-verbs.ts",
      "src/scripts/mini-quiz.ts",
    ];
    const newDataFiles = [
      "src/data/placement-web.ts",
      "src/data/verbs-web.ts",
      "src/data/mini-quiz-web.ts",
      "src/data/web-tools-manifest.ts",
    ];

    for (const file of newAstroFiles) {
      const content = readWebsite(file);
      expect(content, `${file} inline style`).not.toMatch(/\sstyle\s*=/i);
      expect(content, `${file} Allah typo`).not.toMatch(/Аллах/i);
      expect(content, `${file} native speaker claim`).not.toMatch(/носител/i);
      expect(content, `${file} arbitrary module/lesson count`).not.toMatch(
        /(\d+|шесть|шести)\s+(глав|модул|урок)[а-я]*/i,
      );
    }

    for (const file of newScriptFiles) {
      const content = readWebsite(file);
      expect(content, `${file} .style mutation`).not.toMatch(/\.style\./);
      expect(content, `${file} setAttribute style`).not.toMatch(/setAttribute\(\s*["']style["']/);
    }

    for (const file of newDataFiles) {
      const content = readWebsite(file);
      expect(content, `${file} Allah typo`).not.toMatch(/Аллах/i);
      expect(content, `${file} arbitrary module/lesson count`).not.toMatch(
        /(\d+|шесть|шести)\s+(глав|модул|урок)[а-я]*/i,
      );
    }
  });
});
