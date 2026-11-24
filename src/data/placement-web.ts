/**
 * Данные и чистая модель оценки онлайн-теста уровня арабского языка (`/arabic-test/`).
 * Прогрессия повторяет учебную лестницу программы Acrab (`mobile/src/features/fusha/`):
 * алфавит и формы → огласовки и чтение → базовые слова и приветствия → артикль и род → фусха и глаголы.
 */

export type PlacementSkillId = "letters" | "reading" | "vocab" | "grammar" | "fusha";

export interface PlacementSkillMeta {
  id: PlacementSkillId;
  label: string;
}

export interface PlacementOption {
  label: string;
  isArabic: boolean;
}

export interface PlacementQuestion {
  id: string;
  skill: PlacementSkillId;
  prompt: string;
  arabicCue?: string;
  audioSrc?: string;
  audioLabel?: string;
  options: readonly PlacementOption[];
  correctIndex: number;
  explanation: string;
}

export type PlacementLevelId = "zero" | "letters" | "words" | "fusha";

export interface PlacementLevel {
  id: PlacementLevelId;
  title: string;
  badge: string;
  minScore: number;
  maxScore: number;
  summary: string;
  nextSteps: readonly string[];
  appTrack: string;
  recommendedGuideHref: string;
  recommendedGuideLabel: string;
}

export interface SkillBreakdown {
  id: PlacementSkillId;
  label: string;
  correct: number;
  total: number;
}

export interface PlacementResult {
  correct: number;
  total: number;
  percent: number;
  level: PlacementLevel;
  skills: SkillBreakdown[];
}

export const PLACEMENT_PATH = "/arabic-test/";
export const PLACEMENT_PUBLISHED = "2026-11-24";
export const PLACEMENT_MODIFIED = "2026-11-24";

export const PLACEMENT_SKILLS: readonly PlacementSkillMeta[] = [
  { id: "letters", label: "Алфавит и формы" },
  { id: "reading", label: "Огласовки и чтение" },
  { id: "vocab", label: "Базовые слова" },
  { id: "grammar", label: "Артикль и род" },
  { id: "fusha", label: "Фусха и глаголы" },
] as const;

export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  {
    id: "q1-letter-ba",
    skill: "letters",
    prompt: "Послушайте звук и выберите букву «ба»:",
    audioSrc: "/assets/audio/letters/ba.mp3",
    audioLabel: "буква ба",
    options: [
      { label: "ب", isArabic: true },
      { label: "ت", isArabic: true },
      { label: "ث", isArabic: true },
      { label: "ن", isArabic: true },
    ],
    correctIndex: 0,
    explanation: "У буквы ب («ба») одна точка снизу. У ت — две точки сверху, у ث — три сверху, у ن — одна сверху.",
  },
  {
    id: "q2-medial-mim",
    skill: "letters",
    prompt: "В каком слове буква م («мим») стоит в середине?",
    options: [
      { label: "كِتَابٌ", isArabic: true },
      { label: "قَمَرٌ", isArabic: true },
      { label: "بَيْتٌ", isArabic: true },
      { label: "نُورٌ", isArabic: true },
    ],
    correctIndex: 1,
    explanation: "В слове قَمَرٌ («луна») буква م стоит между ق и ر и соединяется с обеих сторон.",
  },
  {
    id: "q3-harakat-kasra",
    skill: "reading",
    prompt: "Какой слог читается с короткой гласной «и» (касра)?",
    audioSrc: "/assets/audio/letters/ba-i.mp3",
    audioLabel: "слог би",
    options: [
      { label: "بَ", isArabic: true },
      { label: "بُ", isArabic: true },
      { label: "بِ", isArabic: true },
      { label: "بْ", isArabic: true },
    ],
    correctIndex: 2,
    explanation: "Касра ставится под буквой (بِ — «би»). Чёрточка сверху — фатха «а» (بَ), петелька сверху — дамма «у» (بُ), кружок — сукун без гласного (بْ).",
  },
  {
    id: "q4-read-kitab",
    skill: "reading",
    prompt: "Прочитайте слово и выберите верный перевод:",
    arabicCue: "كِتَابٌ",
    audioSrc: "/assets/audio/letters/words/kitabun.mp3",
    audioLabel: "слово китабун",
    options: [
      { label: "книга", isArabic: false },
      { label: "дом", isArabic: false },
      { label: "стол", isArabic: false },
      { label: "дверь", isArabic: false },
    ],
    correctIndex: 0,
    explanation: "كِتَابٌ читается «кита̄бун» и означает «книга».",
  },
  {
    id: "q5-greeting-marhaban",
    skill: "vocab",
    prompt: "Что означает приветствие?",
    arabicCue: "مَرْحَبًا",
    audioSrc: "/assets/audio/marhaban.mp3",
    audioLabel: "приветствие мархабан",
    options: [
      { label: "Спасибо", isArabic: false },
      { label: "Здравствуйте / Привет", isArabic: false },
      { label: "Пожалуйста", isArabic: false },
      { label: "До свидания", isArabic: false },
    ],
    correctIndex: 1,
    explanation: "مَرْحَبًا — нейтральное и доброжелательное приветствие «Здравствуйте» или «Привет».",
  },
  {
    id: "q6-reply-kayfa",
    skill: "vocab",
    prompt: "Какой ответ подходит на вопрос «Как дела?»:",
    arabicCue: "كَيْفَ حَالُكَ؟",
    audioSrc: "/assets/audio/kayfa-haluka.mp3",
    audioLabel: "вопрос кайфа халюка",
    options: [
      { label: "صَبَاحُ الْخَيْرِ", isArabic: true },
      { label: "مَسَاءُ الْخَيْرِ", isArabic: true },
      { label: "أَنَا بِخَيْرٍ، شُكْرًا", isArabic: true },
      { label: "عَفْوًا", isArabic: true },
    ],
    correctIndex: 2,
    explanation: "أَنَا بِخَيْرٍ، شُكْرًا — «У меня всё хорошо, спасибо». Остальные варианты — «Доброе утро», «Добрый вечер» и «Пожалуйста / не за что».",
  },
  {
    id: "q7-sun-letter",
    skill: "grammar",
    prompt: "В каком слове «лям» артикля ال сливается со следующей буквой (солнечная буква) и не произносится отдельно?",
    options: [
      { label: "الْقَمَرُ", isArabic: true },
      { label: "الْبَيْتُ", isArabic: true },
      { label: "الْكِتَابُ", isArabic: true },
      { label: "الشَّمْسُ", isArabic: true },
    ],
    correctIndex: 3,
    explanation: "Буква ش — солнечная: артикль сливается с ней, и над ش появляется шадда (الشَّمْسُ — «аш-шамсу»). В остальных словах буквы лунные.",
  },
  {
    id: "q8-gender-agreement",
    skill: "grammar",
    prompt: "Выберите правильное согласование для словосочетания «новая машина»:",
    arabicCue: "سَيَّارَةٌ …",
    options: [
      { label: "سَيَّارَةٌ جَدِيدَةٌ", isArabic: true },
      { label: "سَيَّارَةٌ جَدِيدٌ", isArabic: true },
      { label: "سَيَّارَةٌ جَدِيدُونَ", isArabic: true },
      { label: "سَيَّارَةٌ جُدُدٌ", isArabic: true },
    ],
    correctIndex: 0,
    explanation: "Слово سَيَّارَةٌ оканчивается на та-марбуту (ة) и относится к женскому роду, поэтому прилагательное тоже получает ة: جَدِيدَةٌ.",
  },
  {
    id: "q9-verb-present-1sg",
    skill: "fusha",
    prompt: "Как сказать на фусхе «Я пишу письмо» в настоящем времени?",
    options: [
      { label: "كَتَبْتُ رِسَالَةً", isArabic: true },
      { label: "أَكْتُبُ رِسَالَةً", isArabic: true },
      { label: "يَكْتُبُ رِسَالَةً", isArabic: true },
      { label: "تَكْتُبُ رِسَالَةً", isArabic: true },
    ],
    correctIndex: 1,
    explanation: "Приставка أَـ указывает на 1-е лицо единственного числа настоящего времени: أَكْتُبُ («я пишу»). كَتَبْتُ — прошедшее («я написал»).",
  },
  {
    id: "q10-nonhuman-plural",
    skill: "fusha",
    prompt: "Выберите грамматически верное предложение «Книги полезные»:",
    options: [
      { label: "الْكُتُبُ مُفِيدُونَ", isArabic: true },
      { label: "الْكُتُبُ مُفِيدٌ", isArabic: true },
      { label: "الْكُتُبُ مُفِيدَةٌ", isArabic: true },
      { label: "الْكُتُبُ مُفِيدَاتٌ", isArabic: true },
    ],
    correctIndex: 2,
    explanation: "В фусхе множественное число неодушевлённых (неразумных) существительных (الْكُتُبُ) согласуется как единственное число женского рода: مُفِيدَةٌ.",
  },
] as const;

export const PLACEMENT_LEVELS: readonly PlacementLevel[] = [
  {
    id: "zero",
    title: "С нуля",
    badge: "Старт с алфавита",
    minScore: 0,
    maxScore: 2,
    summary: "Отличная точка для спокойного старта: вы ещё не привыкли к начертанию букв и огласовкам, поэтому лучше идти шаг за шагом с самого начала.",
    nextSteps: [
      "Выучите 28 букв арабского алфавита группами по 4–5 букв, сразу тренируя их формы в слове.",
      "Освойте три короткие огласовки (фатха, касра, дамма) и сукун, чтобы читать первые слоги.",
      "Занимайтесь по 10–15 минут в день со звуком, не опираясь на русскую транскрипцию.",
    ],
    appTrack: "В Acrab начните со стартового курса «Старт» — он полностью бесплатный и ведёт от первой буквы к чтению слов.",
    recommendedGuideHref: "/arabic-alphabet/",
    recommendedGuideLabel: "Открыть таблицу арабского алфавита",
  },
  {
    id: "letters",
    title: "Знакомы с буквами",
    badge: "Алфавит и огласовки",
    minScore: 3,
    maxScore: 5,
    summary: "Вы уже узнаёте часть букв и звуков, но огласовки, чтение целых слов и базовые правила ещё требуют закрепления.",
    nextSteps: [
      "Закрепите пары похожих букв по точкам и несоединяемую шестёрку ا د ذ ر ز و.",
      "Потренируйте чтение огласованных слогов и коротких слов со звуком.",
      "Выучите 20–30 базовых слов и приветствий фусхи в контексте коротких фраз.",
    ],
    appTrack: "В Acrab пройдите короткую проверку при входе или повторите огласовки в стартовом курсе, затем переходите к первым фразам.",
    recommendedGuideHref: "/arabic-vowels/",
    recommendedGuideLabel: "Разобрать все огласовки",
  },
  {
    id: "words",
    title: "Читаете слова",
    badge: "Уверенное чтение",
    minScore: 6,
    maxScore: 7,
    summary: "Вы читаете огласованные слова и понимаете базовые приветствия — пора систематизировать грамматику фусхи и расширять словарь.",
    nextSteps: [
      "Доведите до автоматизма артикль ال с солнечными и лунными буквами, род и согласование прилагательных.",
      "Освойте спряжение частотных глаголов в прошедшем и настоящем времени.",
      "Собирайте собственные короткие предложения на фусхе и повторяйте слова по интервальному расписанию.",
    ],
    appTrack: "В Acrab тест уровня на старте пропустит алфавит и откроет сразу нужную тему программы с теорией, фразами и повторением.",
    recommendedGuideHref: "/arabic-verbs/",
    recommendedGuideLabel: "Открыть справочник спряжения глаголов",
  },
  {
    id: "fusha",
    title: "Базовая фусха",
    badge: "Грамматика и чтение",
    minScore: 8,
    maxScore: 10,
    summary: "Вы уверенно читаете, знаете базовые правила согласования и различаете глагольные формы фусхи.",
    nextSteps: [
      "Углубитесь в производные породы глаголов (II–X), идафу, падежи и сложные предложения.",
      "Читайте адаптированные и классические тексты с полной огласовкой и пословным разбором.",
      "Тренируйте понимание на слух и разбирайте однокоренные семьи слов.",
    ],
    appTrack: "В Acrab адаптивный тест сразу переведёт вас на подходящую ступень программы, а справочник глаголов, корни и Библиотека помогут расти дальше.",
    recommendedGuideHref: "/arabic-verbs/",
    recommendedGuideLabel: "Посмотреть спряжение глаголов I–X пород",
  },
] as const;

export function levelForScore(correct: number): PlacementLevel {
  const clamped = Math.max(0, Math.min(PLACEMENT_QUESTIONS.length, Math.floor(correct)));
  return (
    PLACEMENT_LEVELS.find((level) => clamped >= level.minScore && clamped <= level.maxScore) ??
    PLACEMENT_LEVELS[0]!
  );
}

/** Чистая функция подсчёта результата: используется и в браузере, и в unit-тестах. */
export function evaluatePlacement(answers: readonly (number | null)[]): PlacementResult {
  const total = PLACEMENT_QUESTIONS.length;
  let correct = 0;

  const skillCounters = new Map<PlacementSkillId, { correct: number; total: number }>(
    PLACEMENT_SKILLS.map((skill) => [skill.id, { correct: 0, total: 0 }]),
  );

  PLACEMENT_QUESTIONS.forEach((question, index) => {
    const bucket = skillCounters.get(question.skill)!;
    bucket.total += 1;
    if (answers[index] === question.correctIndex) {
      correct += 1;
      bucket.correct += 1;
    }
  });

  const skills: SkillBreakdown[] = PLACEMENT_SKILLS.map((skill) => {
    const bucket = skillCounters.get(skill.id)!;
    return {
      id: skill.id,
      label: skill.label,
      correct: bucket.correct,
      total: bucket.total,
    };
  });

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    total,
    percent,
    level: levelForScore(correct),
    skills,
  };
}
