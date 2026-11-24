import type { SiteRoute } from "../lib/routes";
import type { GuideLink } from "../seo/guides";

/**
 * Манифест восьми новых SEO-статей для подключения в общие реестры сайта
 * (`src/lib/routes.ts`, `src/seo/guides.ts`, `public/llms.txt`, `tools/check_site.py`).
 * Вынесен отдельно, чтобы ветка контента не конфликтовала с общими реестрами.
 */
export const NEW_GUIDES_LASTMOD = "2026-11-24";

export const NEW_GUIDE_ROUTES: SiteRoute[] = [
  { path: "/duolingo-arabic/", source: "src/pages/duolingo-arabic/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/ai-arabic-tutor/", source: "src/pages/ai-arabic-tutor/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/bayna-yadayk/", source: "src/pages/bayna-yadayk/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/qiraa-rashida/", source: "src/pages/qiraa-rashida/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/islamic-phrases/", source: "src/pages/islamic-phrases/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/how-to-read-arabic/", source: "src/pages/how-to-read-arabic/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/arabic-numbers/", source: "src/pages/arabic-numbers/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
  { path: "/arabic-travel-phrases/", source: "src/pages/arabic-travel-phrases/index.astro", indexable: true, section: "articles", guide: true, lastmod: NEW_GUIDES_LASTMOD },
];

export const NEW_GUIDES: GuideLink[] = [
  {
    href: "/duolingo-arabic/",
    title: "Аналоги Duolingo для арабского на русском",
    short: "Аналоги Duolingo",
    kicker: "Сравнение",
    summary: "Почему в Duolingo нет курса с русского и сравнение Acrab, Busuu, Drops, AlifBee и учебников.",
    group: "tools",
  },
  {
    href: "/ai-arabic-tutor/",
    title: "ИИ для изучения арабского языка",
    short: "ИИ для арабского",
    kicker: "Практика",
    summary: "Разбор грамматики, огласовки, спряжение, корни слов, ошибки чат-ботов и ИИ-ассистент Acrab.",
    group: "tools",
  },
  {
    href: "/bayna-yadayk/",
    title: "Аль-Арабийя байна ядайк: как заниматься",
    short: "Байна ядайк",
    kicker: "Учебник",
    summary: "Четыре уровня учебника, кому подходит, трудности самообучения и чтение офлайн в Библиотеке.",
    group: "tools",
  },
  {
    href: "/qiraa-rashida/",
    title: "Аль-Кироату ар-Рашида с огласовками",
    short: "Аль-Кироату ар-Рашида",
    kicker: "Книга",
    summary: "Книга для первого чтения, отрывок с пословным переводом по нажатию и 90 текстов в Acrab.",
    group: "reading",
  },
  {
    href: "/islamic-phrases/",
    title: "Исламские фразы на арабском",
    short: "Исламские фразы",
    kicker: "Фразы",
    summary: "Бисмилляh, альхамдулилляh, ин шаа Аллаh, ма шаа Аллаh и другие выражения с огласовками и смыслом.",
    group: "phrases",
  },
  {
    href: "/how-to-read-arabic/",
    title: "Как научиться читать по-арабски с нуля",
    short: "Как читать по-арабски",
    kicker: "Чтение",
    summary: "Шесть букв без соединения, лям-алиф, та марбута, алиф максура, хамза и чтение по слогам.",
    group: "reading",
  },
  {
    href: "/arabic-numbers/",
    title: "Цифры и числа на арабском от 0 до 100",
    short: "Цифры и числа",
    kicker: "Счёт",
    summary: "Восточные цифры ٠–٩, числа 0–100 с огласовками, направление записи и правила согласования.",
    group: "phrases",
  },
  {
    href: "/arabic-travel-phrases/",
    title: "Арабский разговорник для ОАЭ и Египта",
    short: "Разговорник для поездок",
    kicker: "Поездка",
    summary: "Фразы на фусхе для аэропорта, отеля, кафе, магазинов и цен — с огласовками и озвучкой.",
    group: "phrases",
  },
];

export const NEW_GUIDE_LLMS_BULLETS: readonly string[] = [
  "- [Аналоги Duolingo для арабского на русском](https://acrab.ru/duolingo-arabic/): почему в Duolingo нет курса с русского, сравнение Acrab, Duolingo, Busuu, Drops, AlifBee и учебников.",
  "- [ИИ для изучения арабского языка](https://acrab.ru/ai-arabic-tutor/): разбор грамматики, огласовки, спряжение, корни, ошибки обычных чат-ботов и ИИ-ассистент Acrab.",
  "- [Аль-Арабийя байна ядайк](https://acrab.ru/bayna-yadayk/): структура четырёх уровней учебника, трудности самостоятельной работы и чтение PDF без интернета в Библиотеке Acrab.",
  "- [Аль-Кироату ар-Рашида](https://acrab.ru/qiraa-rashida/): книга для первого чтения на арабском, разбор первого отрывка с огласовками и 90 текстов с переводом по нажатию в Acrab.",
  "- [Исламские фразы на арабском](https://acrab.ru/islamic-phrases/): бисмилляh, альхамдулилляh, ин шаа Аллаh, ма шаа Аллаh, субхана-Ллаh, астагфиру-Ллаh, барака-Ллаhу фика, джазака-Ллаhу хайран и другие с огласовками.",
  "- [Как научиться читать по-арабски с нуля](https://acrab.ru/how-to-read-arabic/): шесть несоединяемых букв, лям-алиф, та марбута, алиф максура, хамза и чтение слов по слогам.",
  "- [Цифры и числа на арабском от 0 до 100](https://acrab.ru/arabic-numbers/): восточные цифры ٠–٩, числа с огласовками, порядок записи в тексте справа налево и правила согласования.",
  "- [Арабский разговорник для ОАЭ и Египта](https://acrab.ru/arabic-travel-phrases/): полезные фразы на фусхе для аэропорта, отеля, кафе, магазинов и цен, отличия от уличной речи.",
];

export const NEW_GUIDE_CHECK_SITE_SLUGS: readonly string[] = NEW_GUIDE_ROUTES.map((route) =>
  route.path.slice(0, -1),
);

export const NEW_GUIDE_CHECK_SITE_ROUTES: Readonly<Record<string, string>> = Object.fromEntries(
  NEW_GUIDE_CHECK_SITE_SLUGS.map((slug) => [slug, `${slug.slice(1)}/index.html`]),
);
