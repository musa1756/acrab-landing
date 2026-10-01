/**
 * Текст с арабскими вставками → безопасный HTML. Каждый арабский фрагмент
 * (буквы, огласовки, пробелы между арабскими словами) получает
 * `<span class="arabic-inline" lang="ar" dir="rtl">`, как в статьях сайта.
 * Остальной текст экранируется, поэтому результат годится для `set:html`.
 */
const ARABIC = "[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]";
const ARABIC_RUN = new RegExp(`${ARABIC}+(?:[ \\u00A0]+${ARABIC}+)*`, "g");

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function richArabic(text: string): string {
  return escapeHtml(text).replace(ARABIC_RUN, (run) => `<span class="arabic-inline" lang="ar" dir="rtl">${run}</span>`);
}
