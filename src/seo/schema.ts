import { pageUrl, SITE_URL } from "../lib/routes";
import { APP_STORE_URL, GOOGLE_PLAY_URL, RUSTORE_URL } from "../lib/stores";
import { STORE_REVIEWS } from "../data/store-reviews";
import { DEFAULT_PRICES } from "../features/payment/payment-model";

/**
 * Структурированные данные schema.org для поисковиков и ИИ-поиска.
 * Здесь только то, что подтверждается сайтом, приложением и публичными
 * отзывами из `src/data/store-reviews.ts` (число оценок не выдумывается).
 */

export { RUSTORE_URL, SITE_URL };
export const LOGO_URL = `${SITE_URL}/assets/acrab-icon-512.jpg`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const APP_ID = `${SITE_URL}/#app`;

type Schema = Record<string, unknown>;

const absolute = pageUrl;

const publisher = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Acrab",
  alternateName: ["Акраб"],
  legalName: "ИП Лагуткин Максим Дмитриевич",
  url: `${SITE_URL}/`,
  logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
};

export const organizationSchema: Schema = {
  "@context": "https://schema.org",
  ...publisher,
  description: "Acrab — приложение для последовательного изучения литературного арабского языка с объяснениями на русском.",
  sameAs: [APP_STORE_URL, GOOGLE_PLAY_URL, RUSTORE_URL, "https://t.me/musa1756_ai"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/support/`,
    email: "lagutkin.maksim.03@mail.ru",
    availableLanguage: "ru",
  },
};

const APP_SCREENSHOTS = [
  `${SITE_URL}/assets/about/program-path.webp`,
  `${SITE_URL}/assets/about/lesson-build.webp`,
  `${SITE_URL}/assets/about/tool-conjugation.webp`,
  `${SITE_URL}/assets/about/assistant-2026-10.webp`,
];

const APP_OFFERS = [
  { "@type": "Offer", name: "Бесплатный старт (курс «Старт»)", price: "0", priceCurrency: "RUB" },
  { "@type": "Offer", name: "Acrab Premium — Месяц", price: String(DEFAULT_PRICES.monthly), priceCurrency: "RUB", url: `${SITE_URL}/buy/` },
  { "@type": "Offer", name: "Acrab Premium — Год", price: String(DEFAULT_PRICES.annual), priceCurrency: "RUB", url: `${SITE_URL}/buy/` },
  { "@type": "Offer", name: "Acrab Premium — Навсегда", price: String(DEFAULT_PRICES.lifetime), priceCurrency: "RUB", url: `${SITE_URL}/buy/` },
];

const APP_REVIEWS = STORE_REVIEWS.map((item) => ({
  "@type": "Review",
  author: { "@type": "Person", name: item.author },
  datePublished: item.date,
  ...(item.title ? { name: item.title } : {}),
  reviewBody: item.text,
  reviewRating: {
    "@type": "Rating",
    ratingValue: String(item.rating),
    bestRating: "5",
    worstRating: "1",
  },
}));

/** Приложение одно в трёх магазинах: имена, по которым его ищут, и ссылки на каждую страницу магазина. */
export const appSchema: Schema = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "@id": APP_ID,
  name: "Acrab",
  alternateName: ["Акраб", "Арабский язык с нуля - Acrab"],
  publisher: { "@id": ORGANIZATION_ID },
  url: `${SITE_URL}/`,
  image: LOGO_URL,
  screenshot: APP_SCREENSHOTS,
  description: "Приложение для последовательного изучения литературного арабского языка (фусхи) с объяснениями на русском: алфавит, огласовки, грамматика, слова, спряжение глаголов и ИИ-помощник.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "iOS, iPadOS, Android",
  inLanguage: "ru",
  about: { "@type": "Language", name: "Арабский язык", alternateName: "ar" },
  offers: APP_OFFERS,
  review: APP_REVIEWS,
  installUrl: [APP_STORE_URL, GOOGLE_PLAY_URL, RUSTORE_URL],
  downloadUrl: [APP_STORE_URL, GOOGLE_PLAY_URL, RUSTORE_URL],
  sameAs: [APP_STORE_URL, GOOGLE_PLAY_URL, RUSTORE_URL],
};

export const websiteSchema: Schema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Acrab",
  url: `${SITE_URL}/`,
  inLanguage: "ru",
  publisher: { "@id": ORGANIZATION_ID },
};

export const contactPageSchema: Schema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Помощь и поддержка Acrab",
  url: `${SITE_URL}/support/`,
  inLanguage: "ru",
  mainEntity: { "@id": ORGANIZATION_ID },
};

export interface Crumb {
  name: string;
  /** Абсолютный путь; у последней крошки — текущая страница. */
  path: string;
}

export interface GuideMeta {
  headline: string;
  description: string;
  path: string;
  image: string;
  /** ISO-дата первой публикации. */
  datePublished: string;
  /** ISO-дата последнего содержательного изменения; её же показывает страница. */
  dateModified: string;
  crumbs: Crumb[];
  /** Связь статьи с основной сущностью (например, `#app`). */
  aboutId?: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export function articleSchema(meta: GuideMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.headline,
    description: meta.description,
    image: [absolute(meta.image)],
    datePublished: meta.datePublished,
    dateModified: meta.dateModified,
    inLanguage: "ru",
    mainEntityOfPage: absolute(meta.path),
    ...(meta.aboutId ? { about: { "@id": meta.aboutId } } : {}),
    author: publisher,
    publisher,
  };
}

export function webPageSchema(meta: GuideMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: meta.headline,
    description: meta.description,
    url: absolute(meta.path),
    inLanguage: "ru",
    datePublished: meta.datePublished,
    dateModified: meta.dateModified,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface FaqItem {
  question: string;
  /** Ответ простым текстом: он же выводится на странице. */
  answer: string;
}

export function faqSchema(items: FaqItem[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface WebToolMeta {
  name: string;
  description: string;
  /** Абсолютный путь страницы с инструментом. */
  path: string;
}

/** Бесплатный инструмент в браузере (онлайн-клавиатура): WebApplication без рейтингов и отзывов. */
export function webApplicationSchema(meta: WebToolMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: meta.name,
    description: meta.description,
    url: absolute(meta.path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface DefinedTermMeta {
  name: string;
  description: string;
  path: string;
  termCode?: string;
  inDefinedTermSetPath?: string;
}

export function definedTermSchema(meta: DefinedTermMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: meta.name,
    description: meta.description,
    url: absolute(meta.path),
    inLanguage: "ru",
    ...(meta.termCode ? { termCode: meta.termCode } : {}),
    ...(meta.inDefinedTermSetPath ? { inDefinedTermSet: absolute(meta.inDefinedTermSetPath) } : {}),
  };
}

export interface DefinedTermSetMeta {
  name: string;
  description: string;
  path: string;
  terms: Array<{ name: string; termCode: string; path: string }>;
}

export function definedTermSetSchema(meta: DefinedTermSetMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: meta.name,
    description: meta.description,
    url: absolute(meta.path),
    inLanguage: "ru",
    hasDefinedTerm: meta.terms.map((term) => ({
      "@type": "DefinedTerm",
      name: term.name,
      termCode: term.termCode,
      url: absolute(term.path),
    })),
  };
}

export interface AudioObjectMeta {
  name: string;
  description?: string;
  contentPath: string;
  inLanguage?: string;
}

export function audioObjectSchema(meta: AudioObjectMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    name: meta.name,
    ...(meta.description ? { description: meta.description } : {}),
    contentUrl: absolute(meta.contentPath),
    encodingFormat: "audio/mpeg",
    inLanguage: meta.inLanguage ?? "ar",
  };
}

export interface HowToStepMeta {
  name: string;
  text: string;
  url?: string;
}

export interface HowToMeta {
  name: string;
  description: string;
  path: string;
  steps: HowToStepMeta[];
}

export function howToSchema(meta: HowToMeta): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: meta.name,
    description: meta.description,
    inLanguage: "ru",
    url: absolute(meta.path),
    step: meta.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : {}),
    })),
  };
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «2026-10-01» → «1 октября 2026». */
export function formatRuDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
