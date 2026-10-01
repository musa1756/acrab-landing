import { describe, expect, test } from "bun:test";
import {
  ARABIC_KEYS,
  ARABIC_KEYS_BY_CODE,
  backspaceRange,
  charForCode,
  DAMMA,
  DAMMATAN,
  deleteBackward,
  EXTRA_KEYS,
  FATHA,
  FATHATAN,
  insertText,
  isCombiningMark,
  KASRA,
  KASRATAN,
  KEY_ROWS,
  keyCaption,
  SHADDA,
  SUKUN,
  TATWEEL,
  transliterate,
} from "../src/scripts/arabic-keyboard-model";

describe("arabic keyboard layout", () => {
  test("follows the Windows Arabic (101) letter rows", () => {
    const row = (codes: readonly string[]) => codes.map((code) => charForCode(code, false)).join("");
    expect(row(KEY_ROWS[1]!.slice(0, 12))).toBe("ضصثقفغعهخحجد");
    expect(row(KEY_ROWS[2]!)).toBe("شسيبلاتنمكط");
    expect(row(KEY_ROWS[3]!)).toBe("ئءؤرلاىةوزظ");
    expect(charForCode("Backquote", false)).toBe("ذ");
  });

  test("puts harakat and hamza forms on the Shift layer", () => {
    expect(charForCode("KeyQ", true)).toBe(FATHA);
    expect(charForCode("KeyW", true)).toBe(FATHATAN);
    expect(charForCode("KeyE", true)).toBe(DAMMA);
    expect(charForCode("KeyR", true)).toBe(DAMMATAN);
    expect(charForCode("KeyA", true)).toBe(KASRA);
    expect(charForCode("KeyS", true)).toBe(KASRATAN);
    expect(charForCode("KeyX", true)).toBe(SUKUN);
    expect(charForCode("Backquote", true)).toBe(SHADDA);
    expect(charForCode("KeyH", true)).toBe("أ");
    expect(charForCode("KeyY", true)).toBe("إ");
    expect(charForCode("KeyN", true)).toBe("آ");
    expect(charForCode("KeyX", false)).toBe("ء");
    expect(charForCode("KeyC", false)).toBe("ؤ");
    expect(charForCode("KeyZ", false)).toBe("ئ");
  });

  test("reaches all 28 letters, types eastern digits and ignores unknown keys", () => {
    const base = ARABIC_KEYS.map((key) => key.base).join("");
    for (const letter of "ابتثجحخدذرزسشصضطظعغفقكلمنهوي") expect(base, letter).toContain(letter);
    expect(["Digit1", "Digit5", "Digit0"].map((code) => charForCode(code, false)).join("")).toBe("١٥٠");
    expect(charForCode("Numpad1", false)).toBeNull();
    expect(charForCode("Space", false)).toBeNull();
    expect(charForCode("", true)).toBeNull();
  });

  test("lists every key once with names for screen readers", () => {
    const codes = ARABIC_KEYS.map((key) => key.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...KEY_ROWS.flat()].sort()).toEqual([...codes].sort());
    for (const key of ARABIC_KEYS) {
      expect(key.baseName, key.code).toBeTruthy();
      expect(key.shiftName, key.code).toBeTruthy();
      expect(key.base, key.code).not.toBe(key.shift);
      expect(ARABIC_KEYS_BY_CODE[key.code]).toBe(key);
    }
    expect(EXTRA_KEYS.every((item) => item.char && item.name)).toBe(true);
  });

  test("draws marks on a tatweel so they are visible on a key", () => {
    expect(isCombiningMark(FATHA)).toBe(true);
    expect(isCombiningMark("ب")).toBe(false);
    expect(keyCaption(SHADDA)).toBe(TATWEEL + SHADDA);
    expect(keyCaption("ض")).toBe("ض");
    expect(keyCaption("لإ")).toBe("لإ");
    expect(keyCaption(TATWEEL)).toBe(TATWEEL + TATWEEL);
  });
});

describe("text edits", () => {
  test("inserts at the caret and replaces a selection", () => {
    expect(insertText("اب", 1, 1, "ت")).toEqual({ value: "اتب", caret: 2 });
    expect(insertText("ابج", 1, 2, "ت")).toEqual({ value: "اتج", caret: 2 });
    expect(insertText("", 0, 0, "لا")).toEqual({ value: "لا", caret: 2 });
    expect(insertText("اب", 99, 99, "ت")).toEqual({ value: "ابت", caret: 3 });
  });

  test("backspace removes the selection or one symbol, a mark before its letter", () => {
    expect(backspaceRange("abc", 2, 2)).toEqual([1, 2]);
    expect(backspaceRange("abc", 1, 3)).toEqual([1, 3]);
    expect(backspaceRange("abc", 0, 0)).toEqual([0, 0]);
    const vocalized = `ب${FATHA}`;
    expect(deleteBackward(vocalized, 2, 2)).toEqual({ value: "ب", caret: 1 });
    expect(deleteBackward("ب", 1, 1)).toEqual({ value: "", caret: 0 });
    expect(deleteBackward("a😀", 3, 3)).toEqual({ value: "a", caret: 1 });
  });
});

describe("transliteration", () => {
  const word = (...parts: string[]) => parts.join("");

  test("reads short vowels, sukun and tanwin", () => {
    expect(transliterate(word("ك", FATHA, "ت", FATHA, "ب", FATHA))).toBe("катаба");
    expect(transliterate(word("ب", KASRA, "ن", SUKUN, "ت", DAMMATAN))).toBe("бинтун");
    expect(transliterate(word("ك", KASRA, "ت", FATHA, "ا", "ب", DAMMATAN))).toBe("китабун");
    expect(transliterate(word("ش", DAMMA, "ك", SUKUN, "ر", FATHATAN, "ا"))).toBe("шукран");
  });

  test("doubles a consonant under shadda in either mark order", () => {
    expect(transliterate(word("أ", DAMMA, "م", DAMMATAN, SHADDA))).toBe("уммун");
    expect(transliterate(word("م", DAMMA, "ع", FATHA, "ل", SHADDA, KASRA, "م", DAMMATAN))).toBe("му‘аллимун");
    expect(transliterate(word("م", DAMMA, "ع", FATHA, "ل", KASRA, SHADDA, "م", DAMMATAN))).toBe("му‘аллимун");
  });

  test("treats alif, waw and yaa after a matching vowel as one long sound", () => {
    expect(transliterate(word("ن", DAMMA, "و", "ر", DAMMATAN))).toBe("нурун");
    expect(transliterate(word("ك", FATHA, "ب", KASRA, "ي", "ر", DAMMATAN))).toBe("кабирун");
    expect(transliterate(word("ب", FATHA, "ي", SUKUN, "ت", DAMMATAN))).toBe("байтун");
    expect(transliterate(word("ي", FATHA, "و", SUKUN, "م", DAMMATAN))).toBe("йаумун");
    expect(transliterate(word("ه", DAMMA, "و", FATHA))).toBe("хува");
  });

  test("spells ta marbuta and hamza", () => {
    expect(transliterate(word("م", FATHA, "د", SUKUN, "ر", FATHA, "س", FATHA, "ة", DAMMATAN))).toBe("мадрасатун");
    expect(transliterate(word("م", FATHA, "د", SUKUN, "ر", FATHA, "س", FATHA, "ة"))).toBe("мадраса");
    // Хамза в начале слова не показывается, внутри слова — апостроф.
    expect(transliterate(word("أ", FATHA, "ن", FATHA, "ا"))).toBe("ана");
    expect(transliterate(word("س", DAMMA, "ؤ", FATHA, "ا", "ل", DAMMATAN))).toBe("су’алун");
  });

  test("keeps spaces, converts digits and punctuation, leaves other text as is", () => {
    expect(transliterate(word("ع", FATHA, "ل", FATHA, "ي", SUKUN, "ك", DAMMA, "م", SUKUN, " ", "ع", FATHA, "ل", FATHA, "ي", SUKUN, "ك", DAMMA, "م", SUKUN))).toBe("‘алайкум ‘алайкум");
    expect(transliterate("٢٠٢٦")).toBe("2026");
    expect(transliterate("كتاب؟")).toBe("ктаб?");
    expect(transliterate("abc ١")).toBe("abc 1");
    expect(transliterate("")).toBe("");
  });

  test("shows consonants only when the text has no vowel marks", () => {
    expect(transliterate("مدرسة")).toBe("мдрса");
    expect(transliterate("حخ")).toBe("хх");
  });
});
