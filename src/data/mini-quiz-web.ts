/**
 * Данные 4-шагового интерактивного мини-тренажёра (`AlphabetMiniQuiz.astro`).
 * Каждый указанный аудиофайл проверяется в `website/tests/web-tools.test.ts` на
 * физическое наличие в `website/public/assets/audio/`.
 */

export interface MiniQuizOption {
  label: string;
  isArabic: boolean;
}

export interface MiniQuizStep {
  id: string;
  badge: string;
  prompt: string;
  audioSrc?: string;
  audioLabel?: string;
  options: readonly MiniQuizOption[];
  correctIndex: number;
  feedbackOk: string;
  feedbackWrong: string;
}

export const MINI_QUIZ_STEPS: readonly MiniQuizStep[] = [
  {
    id: "step-1-letter-ba",
    badge: "Шаг 1 · Буква",
    prompt: "Послушайте звук и нажмите на букву «ба»:",
    audioSrc: "/assets/audio/letters/ba.mp3",
    audioLabel: "буква ба",
    options: [
      { label: "ب", isArabic: true },
      { label: "ت", isArabic: true },
      { label: "ث", isArabic: true },
      { label: "ن", isArabic: true },
    ],
    correctIndex: 0,
    feedbackOk: "Точно! У буквы ب («ба») одна точка снизу.",
    feedbackWrong: "Буква «ба» — это ب: у неё одна точка снизу, а у ت، ث، ن точки сверху.",
  },
  {
    id: "step-2-medial-mim",
    badge: "Шаг 2 · Форма в слове",
    prompt: "Найдите слово, в котором буква م («мим») стоит в середине:",
    options: [
      { label: "قَمَرٌ", isArabic: true },
      { label: "كِتَابٌ", isArabic: true },
      { label: "بَيْتٌ", isArabic: true },
      { label: "نُورٌ", isArabic: true },
    ],
    correctIndex: 0,
    feedbackOk: "Верно! В слове قَمَرٌ («луна») буква م соединяет ق и ر.",
    feedbackWrong: "Буква م в середине стоит в слове قَمَرٌ («луна»).",
  },
  {
    id: "step-3-syllable-ba-a",
    badge: "Шаг 3 · Огласовка",
    prompt: "Послушайте слог «ба» с фатхой и выберите верную запись:",
    audioSrc: "/assets/audio/letters/ba-a.mp3",
    audioLabel: "слог ба",
    options: [
      { label: "بَ", isArabic: true },
      { label: "بِ", isArabic: true },
      { label: "بُ", isArabic: true },
    ],
    correctIndex: 0,
    feedbackOk: "Отлично! Чёрточка над буквой — фатха, она даёт короткий «а» (بَ).",
    feedbackWrong: "Слог «ба» пишется с фатхой сверху — بَ (بِ — «би», بُ — «бу»).",
  },
  {
    id: "step-4-greeting-marhaban",
    badge: "Шаг 4 · Первое слово",
    prompt: "Послушайте приветствие «Здравствуйте / Привет» и выберите его:",
    audioSrc: "/assets/audio/marhaban.mp3",
    audioLabel: "приветствие мархабан",
    options: [
      { label: "مَرْحَبًا", isArabic: true },
      { label: "شُكْرًا", isArabic: true },
    ],
    correctIndex: 0,
    feedbackOk: "Супер! مَرْحَبًا — «Здравствуйте / Привет», а شُكْرًا — «Спасибо».",
    feedbackWrong: "Приветствие — это مَرْحَبًا («Здравствуйте / Привет»), а شُكْرًا означает «Спасибо».",
  },
] as const;

export function miniQuizSummary(score: number, total: number): string {
  if (score === total) {
    return "Все задания без ошибок — вы уже готовы читать первые слова с огласовками.";
  }
  if (score >= Math.ceil(total * 0.75)) {
    return "Отличный старт: основа уже ловится на слух, в приложении она быстро дойдёт до автоматизма.";
  }
  return "Хорошая разминка! В приложении каждая буква и огласовка закрепляются шаг за шагом со звуком.";
}
