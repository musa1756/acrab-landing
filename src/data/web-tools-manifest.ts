/**
 * Манифест интерактивных веб-инструментов для подключения в общие реестры сайта
 * (`src/lib/routes.ts`, `src/seo/guides.ts`, `src/pages/sitemap.xml.ts`,
 * `public/llms.txt`, `tools/check_site.py`, `tests/site.test.ts`).
 */
import type { SiteRoute } from "../lib/routes";
import { PLACEMENT_MODIFIED, PLACEMENT_PATH } from "./placement-web";
import { VERB_MODIFIED, VERB_SECTION_PATH, WEB_VERBS, verbPath } from "./verbs-web";

export const WEB_TOOL_ROUTES: readonly SiteRoute[] = [
  {
    path: PLACEMENT_PATH,
    source: "src/pages/arabic-test/index.astro",
    indexable: true,
    section: "articles",
    guide: true,
    lastmod: PLACEMENT_MODIFIED,
  },
  {
    path: VERB_SECTION_PATH,
    source: "src/pages/arabic-verbs/index.astro",
    indexable: true,
    section: "articles",
    guide: true,
    lastmod: VERB_MODIFIED,
  },
] as const;

export const WEB_VERB_SLUGS: readonly string[] = WEB_VERBS.map((verb) => verb.slug);

export const WEB_VERB_ROUTES: readonly string[] = WEB_VERBS.map((verb) => verbPath(verb.slug));

export interface WebToolGuideEntry {
  href: string;
  label: string;
  title: string;
  description: string;
  group: "start" | "system";
}

export const WEB_TOOL_GUIDES: readonly WebToolGuideEntry[] = [
  {
    href: PLACEMENT_PATH,
    label: "Тест · 2 минуты",
    title: "Онлайн-тест уровня арабского языка",
    description:
      "10 вопросов с озвучкой от букв и огласовок до фусхи: мгновенный результат и план следующих шагов.",
    group: "start",
  },
  {
    href: VERB_SECTION_PATH,
    label: `Справочник · ${WEB_VERBS.length} глаголов`,
    title: "Спряжение арабских глаголов онлайн",
    description:
      "Таблицы прошедшего, настоящего и повелительного времени с огласовками, корнем, породой и масдаром.",
    group: "system",
  },
] as const;

export interface WebToolLlmsEntry {
  url: string;
  title: string;
  description: string;
}

export const WEB_TOOLS_LLMS_ENTRIES: readonly WebToolLlmsEntry[] = [
  {
    url: `https://acrab.ru${PLACEMENT_PATH}`,
    title: "Онлайн-тест уровня арабского языка",
    description:
      "Бесплатная экспресс-проверка из 10 заданий с озвучкой (буквы, огласовки, слова, артикль, фусха) и мгновенным разбором по четырём уровням.",
  },
  {
    url: `https://acrab.ru${VERB_SECTION_PATH}`,
    title: "Спряжение арабских глаголов онлайн",
    description: `${WEB_VERBS.length} частотных глаголов I–X пород с поиском по-русски, по-арабски и по корню, а также отдельные страницы /arabic-verbs/<slug>/ (например, https://acrab.ru/arabic-verbs/kataba/) с полными таблицами на 14 строк (13 различающихся форм).`,
  },
] as const;

export const WEB_TOOLS_EMBED_WIDGET = {
  componentPath: "src/components/AlphabetMiniQuiz.astro",
  recommendedTargets: ["/", "/arabic-alphabet/", "/arabic-vowels/"] as const,
  metricaGoals: {
    placement: ["test_start", "test_complete"] as const,
    verbs: ["verb_search"] as const,
    miniQuiz: ["mini_quiz_start", "mini_quiz_complete"] as const,
  },
} as const;
