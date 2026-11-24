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

const ARABIC_COMBINING = /^[\u064b-\u065f\u0670]+/;
const ALIF_VARIANTS = new Set(["ا", "أ", "إ", "آ", "ٱ"]);

/**
 * Подсвечивает целевую букву (вместе с её огласовками) внутри арабского слова
 * тегом `<span class="letter-mark">` без разрыва связного написания.
 */
export function highlightArabicLetter(word: string, targetChar: string): string {
  const isMatch = (ch: string) => (targetChar === "ا" ? ALIF_VARIANTS.has(ch) : ch === targetChar);
  const chars = [...word];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (isMatch(ch)) {
      let cluster = ch;
      while (i + 1 < chars.length && ARABIC_COMBINING.test(chars[i + 1]!)) {
        i += 1;
        cluster += chars[i]!;
      }
      out += `<span class="letter-mark">${escapeHtml(cluster)}</span>`;
    } else {
      out += escapeHtml(ch);
    }
  }
  return out;
}
