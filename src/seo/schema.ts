import { APP_STORE_URL, GOOGLE_PLAY_URL } from "../scripts/store-redirect-model";

/**
 * Структурированные данные schema.org для поисковиков и ИИ-поиска.
 * Здесь только то, что подтверждается сайтом и приложением: рейтингов,
 * отзывов и числа учеников в разметке нет (см. PRODUCT.md).
 */

export const SITE_URL = "https://acrab.ru";
export const RUSTORE_URL = "https://www.rustore.ru/catalog/app/com.acrab";
export const LOGO_URL = `${SITE_URL}/assets/acrab-icon-512.jpg`;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

type Schema = Record<string, unknown>;

const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

const publisher = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Acrab",
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
    availableLanguage: "ru",
  },
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
    author: publisher,
    publisher,
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

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «2026-10-01» → «1 октября 2026». */
export function formatRuDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
