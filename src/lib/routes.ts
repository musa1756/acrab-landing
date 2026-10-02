/**
 * Реестр страниц сайта: разделы шапки и все маршруты. Из него строятся шапка
 * (`Header.astro`), sitemap (`pages/sitemap.xml.ts`) и списки маршрутов в
 * тестах. Новая страница — строка в `ROUTES`; новая вкладка шапки — ещё и
 * строка в `SECTIONS`, а странице передаётся `section` с её id.
 *
 * `tools/check_site.py` нарочно держит свой список: он проверяет готовый
 * `site/` независимо от этого файла.
 */

export const SITE_URL = "https://acrab.ru";

/** Абсолютный адрес страницы или ресурса по пути от корня. */
export const pageUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export type SectionId = "home" | "updates" | "buy" | "articles" | "keyboard" | "support";

export interface NavLink {
  id: string;
  href: string;
  label: string;
  /** Подпись на узком экране, если полная не помещается. */
  short?: string;
}

/** Разделы шапки в порядке показа. */
export const SECTIONS: (NavLink & { id: SectionId })[] = [
  { id: "home", href: "/", label: "О приложении", short: "Главная" },
  { id: "updates", href: "/about/", label: "Обновления" },
  { id: "buy", href: "/buy/", label: "Оплата" },
  { id: "articles", href: "/articles/", label: "Статьи" },
  { id: "keyboard", href: "/arabic-keyboard/", label: "Клавиатура" },
  { id: "support", href: "/support/", label: "Помощь" },
];

/** Короткая шапка служебных страниц: оферта, согласие, политика, /get. */
export const SERVICE_NAVS = {
  offer: [
    { id: "buy", href: "/buy/", label: "Оплата" },
    { id: "support", href: "/support/", label: "Помощь" },
    { id: "privacy", href: "/privacy/", label: "Конфиденциальность" },
  ],
  consent: [
    { id: "buy", href: "/buy/", label: "Оплата" },
    { id: "privacy", href: "/privacy/", label: "Конфиденциальность" },
  ],
  get: [
    { id: "home", href: "/", label: "О приложении" },
    { id: "support", href: "/support/", label: "Помощь" },
  ],
} satisfies Record<string, NavLink[]>;

export type ServiceNav = keyof typeof SERVICE_NAVS;

export interface SiteRoute {
  /** Путь с конечной `/`, как в canonical. */
  path: string;
  /** Исходник страницы относительно `website/`. */
  source: string;
  /** Индексируется и входит в sitemap; служебные страницы — `noindex`. */
  indexable: boolean;
  /** Раздел шапки, выбранный на странице. */
  section?: SectionId;
  /** Статья: `GuideLayout`, крошки, Article и FAQ в разметке. */
  guide?: boolean;
  /** `lastmod` в sitemap, если страница обновлена позже `SITEMAP_LASTMOD`. */
  lastmod?: string;
}

/** Все маршруты, кроме 28 страниц букв (`LETTERS` в `seo/letters.ts`). Порядок — порядок sitemap. */
export const ROUTES: SiteRoute[] = [
  { path: "/", source: "src/pages/index.astro", indexable: true, section: "home" },
  { path: "/articles/", source: "src/pages/articles/index.astro", indexable: true, section: "articles" },
  { path: "/learn-arabic/", source: "src/pages/learn-arabic/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-alphabet/", source: "src/pages/arabic-alphabet/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-vowels/", source: "src/pages/arabic-vowels/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/sun-moon-letters/", source: "src/pages/sun-moon-letters/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-hello/", source: "src/pages/arabic-hello/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-thank-you/", source: "src/pages/arabic-thank-you/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/fusha/", source: "src/pages/fusha/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-app/", source: "src/pages/arabic-app/index.astro", indexable: true, section: "articles", guide: true },
  { path: "/arabic-keyboard/", source: "src/pages/arabic-keyboard/index.astro", indexable: true, section: "keyboard", guide: true },
  { path: "/about/", source: "src/pages/about/index.astro", indexable: true, section: "updates" },
  { path: "/support/", source: "src/pages/support/index.astro", indexable: true, section: "support" },
  { path: "/privacy/", source: "src/pages/privacy/index.astro", indexable: true },
  { path: "/buy/", source: "src/pages/buy/index.astro", indexable: false, section: "buy" },
  { path: "/offer/", source: "src/pages/offer/index.astro", indexable: false },
  { path: "/consent/", source: "src/pages/consent/index.astro", indexable: false },
  { path: "/get/", source: "src/pages/get/index.astro", indexable: false },
];

/** `lastmod` в sitemap по умолчанию; у отдельной страницы — поле `lastmod`, у букв — `LETTER_MODIFIED`. */
export const SITEMAP_LASTMOD = "2026-10-01";
