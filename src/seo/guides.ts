/**
 * Все статьи сайта. Из этого списка строятся раздел «Статьи», блок на главной
 * и строка руководств в подвале — новую статью достаточно добавить сюда
 * (плюс sitemap, llms.txt и списки маршрутов в проверках). Онлайн-клавиатуры
 * здесь нет: это отдельный раздел шапки, а не статья.
 */
export interface GuideLink {
  href: string;
  title: string;
  /** Короткое название для подвала. */
  short: string;
  kicker: string;
  summary: string;
  group: "start" | "reading" | "phrases" | "tools";
}

export const GUIDE_GROUPS: Record<GuideLink["group"], string> = {
  start: "С чего начать",
  reading: "Чтение",
  phrases: "Первые фразы",
  tools: "Как учиться",
};

export const GUIDES: GuideLink[] = [
  { href: "/learn-arabic/", title: "Как выучить арабский с нуля", short: "Как выучить арабский", kicker: "План", summary: "Пять этапов, система корней, режим занятий, сроки и частые ошибки.", group: "start" },
  { href: "/fusha/", title: "Что такое фусха", short: "Что такое фусха", kicker: "Выбор", summary: "Литературный арабский и диалекты на примерах.", group: "start" },
  { href: "/arabic-alphabet/", title: "Арабский алфавит", short: "Арабский алфавит", kicker: "Чтение", summary: "Таблица 28 букв с формами и звуками, похожие буквы, хамза и та марбута.", group: "reading" },
  { href: "/arabic-vowels/", title: "Огласовки", short: "Огласовки", kicker: "Чтение", summary: "Фатха, касра, дамма, сукун, шадда и танвин с примерами.", group: "reading" },
  { href: "/sun-moon-letters/", title: "Солнечные и лунные буквы", short: "Солнечные и лунные буквы", kicker: "Первое правило", summary: "Когда артикль звучит «аль», а когда сливается.", group: "reading" },
  { href: "/arabic-hello/", title: "Привет на арабском", short: "Привет на арабском", kicker: "Фразы", summary: "Мархабан, ахлян, ас-саляму алайкум, «доброе утро» и «как дела» с ответами и озвучкой.", group: "phrases" },
  { href: "/arabic-thank-you/", title: "Спасибо на арабском", short: "Спасибо на арабском", kicker: "Фразы", summary: "Шукран, «большое спасибо», формы для мужчины и женщины и ответ «не за что».", group: "phrases" },
  { href: "/arabic-app/", title: "Как выбрать приложение", short: "Приложение для арабского", kicker: "Инструмент", summary: "Пять признаков хорошей программы и как устроен Acrab.", group: "tools" },
];
