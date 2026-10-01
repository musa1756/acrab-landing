/**
 * Модель онлайн-клавиатуры `/arabic-keyboard/`: раскладка, правки текста и
 * приблизительная русская транслитерация. Без DOM, поэтому проверяется
 * юнит-тестами (`tests/arabic-keyboard.test.ts`), а страница строит из неё и
 * разметку при сборке, и поведение в браузере (`arabic-keyboard.ts`).
 */

export const FATHA = "\u064E";
export const DAMMA = "\u064F";
export const KASRA = "\u0650";
export const FATHATAN = "\u064B";
export const DAMMATAN = "\u064C";
export const KASRATAN = "\u064D";
export const SHADDA = "\u0651";
export const SUKUN = "\u0652";
export const TATWEEL = "\u0640";

export interface ArabicKey {
  /** `KeyboardEvent.code` физической клавиши: не зависит от раскладки системы. */
  code: string;
  /** Что вводит клавиша сама и вместе с Shift. */
  base: string;
  shift: string;
  /** Названия для скринридера и подсказок. */
  baseName: string;
  shiftName: string;
  /** Подпись на латинской клавише и буква на ней же в русской раскладке. */
  latin: string;
  ru: string;
}

type Row = readonly [code: string, base: string, shift: string, baseName: string, shiftName: string, latin: string, ru: string];

// Windows «Арабская (101)»: буквы и знаки по физическим клавишам US-клавиатуры.
// Цифры верхнего ряда — восточные арабские ٠–٩, как в этой раскладке.
const ROWS: readonly Row[] = [
  ["Backquote", "ذ", SHADDA, "заль", "шадда, удвоение согласного", "`", "Ё"],
  ["Digit1", "١", "!", "цифра один", "восклицательный знак", "1", "1"],
  ["Digit2", "٢", "@", "цифра два", "знак «собака»", "2", "2"],
  ["Digit3", "٣", "#", "цифра три", "решётка", "3", "3"],
  ["Digit4", "٤", "$", "цифра четыре", "знак доллара", "4", "4"],
  ["Digit5", "٥", "%", "цифра пять", "знак процента", "5", "5"],
  ["Digit6", "٦", "^", "цифра шесть", "знак вставки", "6", "6"],
  ["Digit7", "٧", "&", "цифра семь", "амперсанд", "7", "7"],
  ["Digit8", "٨", "*", "цифра восемь", "звёздочка", "8", "8"],
  ["Digit9", "٩", ")", "цифра девять", "закрывающая скобка", "9", "9"],
  ["Digit0", "٠", "(", "цифра ноль", "открывающая скобка", "0", "0"],
  ["Minus", "-", "_", "дефис", "подчёркивание", "-", "-"],
  ["Equal", "=", "+", "знак равенства", "плюс", "=", "="],

  ["KeyQ", "ض", FATHA, "дад", "фатха", "Q", "Й"],
  ["KeyW", "ص", FATHATAN, "сад", "танвин фатхи", "W", "Ц"],
  ["KeyE", "ث", DAMMA, "са", "дамма", "E", "У"],
  ["KeyR", "ق", DAMMATAN, "каф", "танвин даммы", "R", "К"],
  ["KeyT", "ف", "لإ", "фа", "лям-алиф с хамзой снизу", "T", "Е"],
  ["KeyY", "غ", "إ", "гайн", "алиф с хамзой снизу", "Y", "Н"],
  ["KeyU", "ع", "\u2018", "айн", "левая одинарная кавычка", "U", "Г"],
  ["KeyI", "ه", "÷", "ха с придыханием", "знак деления", "I", "Ш"],
  ["KeyO", "خ", "×", "ха с точкой", "знак умножения", "O", "Щ"],
  ["KeyP", "ح", "؛", "ха без точки", "арабская точка с запятой", "P", "З"],
  ["BracketLeft", "ج", "<", "джим", "знак «меньше»", "[", "Х"],
  ["BracketRight", "د", ">", "даль", "знак «больше»", "]", "Ъ"],
  ["Backslash", "\\", "|", "обратная косая черта", "вертикальная черта", "\\", "\\"],

  ["KeyA", "ش", KASRA, "шин", "касра", "A", "Ф"],
  ["KeyS", "س", KASRATAN, "син", "танвин касры", "S", "Ы"],
  ["KeyD", "ي", "]", "йа", "правая квадратная скобка", "D", "В"],
  ["KeyF", "ب", "[", "ба", "левая квадратная скобка", "F", "А"],
  ["KeyG", "ل", "لأ", "лям", "лям-алиф с хамзой сверху", "G", "П"],
  ["KeyH", "ا", "أ", "алиф", "алиф с хамзой сверху", "H", "Р"],
  ["KeyJ", "ت", TATWEEL, "та", "кашида, растяжка соединения", "J", "О"],
  ["KeyK", "ن", "،", "нун", "арабская запятая", "K", "Л"],
  ["KeyL", "م", "/", "мим", "косая черта", "L", "Д"],
  ["Semicolon", "ك", ":", "кяф", "двоеточие", ";", "Ж"],
  ["Quote", "ط", '"', "та эмфатическая", "двойная кавычка", "'", "Э"],

  ["KeyZ", "ئ", "~", "хамза на йа", "тильда", "Z", "Я"],
  ["KeyX", "ء", SUKUN, "хамза", "сукун", "X", "Ч"],
  ["KeyC", "ؤ", "}", "хамза на вав", "правая фигурная скобка", "C", "С"],
  ["KeyV", "ر", "{", "ра", "левая фигурная скобка", "V", "М"],
  ["KeyB", "لا", "لآ", "лям-алиф", "лям-алиф с мадда", "B", "И"],
  ["KeyN", "ى", "آ", "алиф максура", "алиф с мадда", "N", "Т"],
  ["KeyM", "ة", "\u2019", "та марбута", "правая одинарная кавычка", "M", "Ь"],
  ["Comma", "و", ",", "вав", "запятая", ",", "Б"],
  ["Period", "ز", ".", "зай", "точка", ".", "Ю"],
  ["Slash", "ظ", "؟", "за эмфатическая", "арабский вопросительный знак", "/", "."],
];

export const ARABIC_KEYS: readonly ArabicKey[] = ROWS.map(([code, base, shift, baseName, shiftName, latin, ru]) => ({ code, base, shift, baseName, shiftName, latin, ru }));

export const ARABIC_KEYS_BY_CODE: Readonly<Record<string, ArabicKey>> = Object.fromEntries(ARABIC_KEYS.map((key) => [key.code, key]));

/** Коды клавиш по рядам экранной клавиатуры. */
export const KEY_ROWS: readonly (readonly string[])[] = [
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];

/** Знаки внизу экранной клавиатуры: у них нет своей физической клавиши без Shift. */
export const EXTRA_KEYS: readonly { char: string; name: string }[] = [
  { char: "،", name: "арабская запятая" },
  { char: "؛", name: "арабская точка с запятой" },
  { char: "؟", name: "арабский вопросительный знак" },
  { char: ".", name: "точка" },
  { char: ":", name: "двоеточие" },
];

/** Символ клавиши в нужном слое; `null`, если клавиши в раскладке нет. */
export function charForCode(code: string, shift: boolean): string | null {
  const key = ARABIC_KEYS_BY_CODE[code];
  if (!key) return null;
  return shift ? key.shift : key.base;
}

const COMBINING_MARK = /[\u064B-\u0652\u0670]/;

export function isCombiningMark(char: string): boolean {
  return char.length === 1 && COMBINING_MARK.test(char);
}

/** Подпись на клавише: знак огласовки рисуется на кашиде, иначе он повис бы в воздухе. */
export function keyCaption(char: string): string {
  if (isCombiningMark(char)) return TATWEEL + char;
  if (char === TATWEEL) return TATWEEL + TATWEEL;
  return char;
}

export interface TextEdit {
  value: string;
  /** Позиция курсора после правки. */
  caret: number;
}

function clampRange(value: string, start: number, end: number): [number, number] {
  const from = Math.max(0, Math.min(start, end, value.length));
  const to = Math.max(from, Math.min(Math.max(start, end), value.length));
  return [from, to];
}

export function insertText(value: string, start: number, end: number, text: string): TextEdit {
  const [from, to] = clampRange(value, start, end);
  return { value: value.slice(0, from) + text + value.slice(to), caret: from + text.length };
}

/**
 * Что удалить по «Backspace»: выделение или один предыдущий символ.
 * Огласовка стирается отдельно от буквы: её поставили последней.
 */
export function backspaceRange(value: string, start: number, end: number): [from: number, to: number] {
  const [from, to] = clampRange(value, start, end);
  if (from !== to || from === 0) return [from, to];
  const previous = value.charCodeAt(from - 1);
  const isLowSurrogate = previous >= 0xdc00 && previous <= 0xdfff;
  const high = from >= 2 ? value.charCodeAt(from - 2) : 0;
  const pairStart = isLowSurrogate && high >= 0xd800 && high <= 0xdbff ? from - 2 : from - 1;
  return [pairStart, from];
}

export function deleteBackward(value: string, start: number, end: number): TextEdit {
  const [from, to] = backspaceRange(value, start, end);
  return { value: value.slice(0, from) + value.slice(to), caret: from };
}

// ── Транслитерация ──────────────────────────────────────────────────────────

/**
 * Приблизительная русская транскрипция. Считает только знаки, которые стоят
 * в тексте: без огласовок гласных нет. Эмфатические и «мягкие» согласные не
 * различаются (ح и خ — «х», ص и س — «с»), артикль «аль» и слияние с солнечными
 * буквами не разбираются.
 */
const LETTERS: Readonly<Record<string, string>> = {
  ب: "б",
  ت: "т",
  ث: "с",
  ج: "дж",
  ح: "х",
  خ: "х",
  د: "д",
  ذ: "з",
  ر: "р",
  ز: "з",
  س: "с",
  ش: "ш",
  ص: "с",
  ض: "д",
  ط: "т",
  ظ: "з",
  ع: "\u2018",
  غ: "гъ",
  ف: "ф",
  ق: "къ",
  ك: "к",
  ل: "л",
  م: "м",
  ن: "н",
  ه: "х",
};

const HAMZA_CARRIERS = new Set(["ء", "أ", "إ", "ؤ", "ئ"]);

const VOWELS: Readonly<Record<string, string>> = {
  [FATHA]: "а",
  [KASRA]: "и",
  [DAMMA]: "у",
  [FATHATAN]: "ан",
  [KASRATAN]: "ин",
  [DAMMATAN]: "ун",
};

const PUNCTUATION: Readonly<Record<string, string>> = { "،": ",", "؛": ";", "؟": "?", [TATWEEL]: "" };

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Удвоение по шадде: у составных «дж», «къ», «гъ» удваивается первая буква. */
function doubled(sound: string): string {
  return sound.length === 1 ? sound + sound : sound[0] + sound;
}

function vowelOf(marks: string): string | null {
  for (const mark of marks) if (mark in VOWELS) return mark;
  return null;
}

export function transliterate(text: string): string {
  let out = "";
  let previousVowel: string | null = null;
  let wordStart = true;
  const chars = Array.from(text);

  for (let i = 0; i < chars.length; i += 1) {
    const base = chars[i]!;
    let marks = "";
    while (i + 1 < chars.length && isCombiningMark(chars[i + 1]!)) {
      marks += chars[i + 1];
      i += 1;
    }

    if (isCombiningMark(base)) continue;

    const digit = EASTERN_DIGITS.indexOf(base);
    if (digit >= 0) {
      out += String(digit);
      wordStart = true;
      previousVowel = null;
      continue;
    }
    if (base in PUNCTUATION) {
      out += PUNCTUATION[base];
      if (base !== TATWEEL) wordStart = true;
      continue;
    }

    const isLetter = base in LETTERS || HAMZA_CARRIERS.has(base) || "اىآةوي".includes(base);
    if (!isLetter) {
      out += base + marks;
      wordStart = /[\s.,;:!?()"'«»\-]/.test(base);
      previousVowel = null;
      continue;
    }

    const vowel = vowelOf(marks);
    const vowelSound = vowel ? VOWELS[vowel]! : "";
    const shadda = marks.includes(SHADDA);
    const sukun = marks.includes(SUKUN);
    const afterFatha = previousVowel === FATHA || previousVowel === FATHATAN;

    if (base === "ا" || base === "ى") {
      // Алиф, уже «озвученный» фатхой перед ним, лишь растягивает гласный.
      if (vowel) out += vowelSound;
      else if (!afterFatha) out += "а";
    } else if (base === "آ") {
      out += (wordStart ? "" : "\u2019") + "а";
    } else if (HAMZA_CARRIERS.has(base)) {
      out += (wordStart ? "" : "\u2019") + vowelSound;
    } else if (base === "ة") {
      if (vowel) out += "т" + vowelSound;
      else if (!afterFatha) out += "а";
    } else if (base === "و") {
      if (!vowel && previousVowel === DAMMA && !shadda) out += "";
      else if (!vowel && sukun && afterFatha) out += "у";
      else out += (shadda ? "вв" : "в") + vowelSound;
    } else if (base === "ي") {
      if (!vowel && previousVowel === KASRA && !shadda) out += "";
      else out += (shadda ? "йй" : "й") + vowelSound;
    } else {
      const sound = LETTERS[base]!;
      out += (shadda ? doubled(sound) : sound) + vowelSound;
    }

    previousVowel = vowel;
    wordStart = false;
  }

  return out;
}
