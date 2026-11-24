#!/usr/bin/env bun
/**
 * Детерминированный экспорт 58 частотных арабских глаголов из офлайн-каталогов
 * приложения (`mobile/assets/databases/verbs.sqlite` и `word_families.sqlite`)
 * в `website/src/data/verbs-web.ts`.
 *
 * Запуск из корня монорепо или из `website/`:
 *   bun run website/tools/export-web-verbs.ts
 */
import { Database } from "bun:sqlite";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VERB_FORM_NUMERALS, verbFormNumber } from "../../mobile/src/features/tools/catalogs/verbFormNumber";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(WEBSITE_ROOT, "..");
const VERBS_DB_PATH = resolve(REPO_ROOT, "mobile/assets/databases/verbs.sqlite");
const WORD_FAMILIES_DB_PATH = resolve(REPO_ROOT, "mobile/assets/databases/word_families.sqlite");
const OUTPUT_PATH = resolve(WEBSITE_ROOT, "src/data/verbs-web.ts");

interface CuratedVerbSpec {
  slug: string;
  arabic: string;
  russian: string;
  note: string;
  tip: string;
}

const CURATED_VERBS: readonly CuratedVerbSpec[] = [
  // Порода I — базовые частотные глаголы
  {
    slug: "kataba",
    arabic: "كَتَبَ",
    russian: "писать",
    note: "Образцовый правильный глагол I породы: на нём чаще всего разбирают основы спряжения в фусхе.",
    tip: "Корень ك ت ب легко запомнить по слову كِتَابٌ («книга») и مَكْتَبٌ («письменный стол, офис»): все они связаны с письмом.",
  },
  {
    slug: "qaraa",
    arabic: "قَرَأَ",
    russian: "читать",
    note: "Глагол с третьей корневой хамзой: в настоящем времени сохраняет фатху на среднем согласном — يَقْرَأُ.",
    tip: "Сравните с однокоренным словом قِرَاءَةٌ («чтение»): хамза в конце корня меняет подставку в зависимости от соседней гласной.",
  },
  {
    slug: "dhahaba",
    arabic: "ذَهَبَ",
    russian: "идти, уходить",
    note: "Один из первых глаголов движения в программе; часто употребляется с предлогом إِلَى («куда»).",
    tip: "В прошедшем времени гласная — фатха (ذَهَبَ), и в настоящем на среднем согласном тоже фатха (يَذْهَبُ).",
  },
  {
    slug: "faala",
    arabic: "فَعَلَ",
    russian: "делать, совершать",
    note: "Эталонный корень арабской морфологии (ف ع ل): по его шаблону описывают все десять пород глаголов.",
    tip: "Когда в учебниках пишут схему породы вроде فَعَّلَ или اِسْتَفْعَلَ, буквы ف، ع، ل обозначают первую, вторую и третью буквы любого корня.",
  },
  {
    slug: "alima",
    arabic: "عَلِمَ",
    russian: "знать",
    note: "Глагол I породы с кясрой на средней коренной в прошедшем времени (عَلِمَ) и фатхой в настоящем (يَعْلَمُ).",
    tip: "Сравните три ступени одного корня ع ل م: عَلِمَ (знать), عَلَّمَ (обучать, II порода) и تَعَلَّمَ (учиться, V порода).",
  },
  {
    slug: "akala",
    arabic: "أَكَلَ",
    russian: "есть, принимать пищу",
    note: "Хамзованный глагол (первая буква — хамза): в повелительном наклонении хамза выпадает — كُلْ («ешь!»).",
    tip: "Краткое повелительное كُلْ (как и خُذْ от أَخَذَ) — одно из самых частых исключений в живой речи и текстах.",
  },
  {
    slug: "shariba",
    arabic: "شَرِبَ",
    russian: "пить",
    note: "Бытовой глагол модели فَعِلَ — يَفْعَلُ: кясра в прошедшем времени меняется на фатху в настоящем.",
    tip: "Однокоренное слово مَشْرُوبٌ («напиток») помогает мгновенно узнать корень ش ر ب в текстах и меню.",
  },
  {
    slug: "jalasa",
    arabic: "جَلَسَ",
    russian: "сидеть, садиться",
    note: "Правильный глагол с кясрой в настоящем времени (يَجْلِسُ) и в повелительном наклонении (اِجْلِسْ).",
    tip: "От того же корня ج ل س образовано слово مَجْلِسٌ («собрание, совет, гостиная») — буквально «место сидения».",
  },
  {
    slug: "samia",
    arabic: "سَمِعَ",
    russian: "слышать",
    note: "Обозначает восприятие звука; для внимательного слушания чаще используют VIII породу اِسْتَمَعَ.",
    tip: "Запомните пару: سَمِعَ — «услышать, слышать», а اِسْتَمَعَ — «вслушиваться, слушать».",
  },
  {
    slug: "fataha",
    arabic: "فَتَحَ",
    russian: "открывать",
    note: "Правильный глагол с гортанной третьей коренной ح, поэтому в настоящем времени звучит фатха — يَفْتَحُ.",
    tip: "От корня ف ت ح происходит слово مِفْتَاحٌ («ключ») и само название огласовки «фатха» (فَتْحَةٌ — «раскрытие»).",
  },
  {
    slug: "darasa",
    arabic: "دَرَسَ",
    russian: "учить, изучать",
    note: "Учебный глагол I породы с даммой в настоящем времени (يَدْرُسُ) и повелительном (اُدْرُسْ).",
    tip: "Рядом с دَرَسَ («изучать») живут знакомые слова دَرْسٌ («урок»), مَدْرَسَةٌ («школа») и глагол II породы دَرَّسَ («преподавать»).",
  },
  {
    slug: "amila",
    arabic: "عَمِلَ",
    russian: "работать, делать",
    note: "Базовый глагол труда и действия; модель فَعِلَ — يَفْعَلُ с переходом кясры в фатху.",
    tip: "Корень ع م ل даёт частые существительные عَمَلٌ («работа, дело») и عَامِلٌ («работник»).",
  },
  {
    slug: "saala",
    arabic: "سَأَلَ",
    russian: "спрашивать, просить",
    note: "Глагол со средней корневой хамзой: в настоящем времени يَسْأَلُ, масдар — سُؤَالٌ («вопрос»).",
    tip: "Чтобы не путать с سَالَ («течь»), всегда смотрите на хамзу над алифом в سَأَلَ и слове سُؤَالٌ.",
  },
  {
    slug: "qala",
    arabic: "قَالَ",
    russian: "сказать, говорить",
    note: "Самый частый «пустой» глагол (корень ق و ل): долгий алиф в 3-м лице сокращается до даммы перед сукуном — قُلْتُ.",
    tip: "Коренная و возвращается в настоящем времени (يَقُولُ) и в масдаре (قَوْلٌ), а в повелительном сокращается до قُلْ.",
  },
  {
    slug: "kana",
    arabic: "كَانَ",
    russian: "быть, являться",
    note: "Ключевой вспомогательный глагол арабского языка (корень ك و ن); ставит именную часть сказуемого в винительный падеж.",
    tip: "Спрягается так же, как قَالَ: كَانَ → كُنْتُ, يَكُونُ, а повелительная форма — краткое كُنْ («будь!»).",
  },
  {
    slug: "fahima",
    arabic: "فَهِمَ",
    russian: "понимать",
    note: "Частый учебный глагол модели فَعِلَ — يَفْعَلُ; в живой речи регулярно встречается в 1-м и 2-м лице.",
    tip: "Запомните связку هَلْ فَهِمْتَ؟ («Ты понял?») и نَعَمْ، فَهِمْتُ («Да, я понял»): кясра на ه сохраняется во всём прошедшем времени.",
  },
  {
    slug: "kharaja",
    arabic: "خَرَجَ",
    russian: "выходить",
    note: "Антоним глагола دَخَلَ («входить»); оба имеют дамму на средней коренной в настоящем времени (يَخْرُجُ).",
    tip: "Учите в паре с دَخَلَ: خَرَجَ — يَخْرُجُ — خُرُوجٌ («выход»), отсюда слово مَخْرَجٌ («место выхода звука» в фонетике).",
  },
  {
    slug: "dakhala",
    arabic: "دَخَلَ",
    russian: "входить",
    note: "Глагол движения I породы с даммой в настоящем времени (يَدْخُلُ) и повелительной формой اُدْخُلْ.",
    tip: "Корень د خ ل легко узнать на вывесках и в учебниках: دُخُولٌ («вход») и مَدْخَلٌ («подъезд, вход»).",
  },
  {
    slug: "rajaa",
    arabic: "رَجَعَ",
    russian: "возвращаться",
    note: "Правильный глагол с кясрой в настоящем времени (يَرْجِعُ); часто сочетается с предлогом إِلَى.",
    tip: "Запомните кясру в настоящем времени: رَجَعَ — يَرْجِعُ — اِرْجِعْ, как у جَلَسَ — يَجْلِسُ.",
  },
  {
    slug: "nazara",
    arabic: "نَظَرَ",
    russian: "смотреть, глядеть",
    note: "Требует предлога إِلَى («смотреть на что-то»); в настоящем времени принимает дамму — يَنْظُرُ.",
    tip: "От того же корня ن ظ ر образован глагол VIII породы اِنْتَظَرَ («ждать») и слово نَظَرٌ («взгляд»).",
  },
  {
    slug: "akhadha",
    arabic: "أَخَذَ",
    russian: "брать",
    note: "Хамзованный глагол I породы: в 1-м лице настоящего времени две хамзы сливаются в мадду — آخُذُ.",
    tip: "Повелительное наклонение теряет начальную хамзу и звучит коротко: خُذْ («возьми!»), как у أَكَلَ → كُلْ.",
  },
  {
    slug: "wajada",
    arabic: "وَجَدَ",
    russian: "находить",
    note: "Глагол со слабой первой коренной و: в настоящем времени و выпадает — يَجِدُ, в повелительном — جِدْ.",
    tip: "Сравните с وَصَلَ — يَصِلُ: оба глагола с начальной و теряют её в настоящем времени и повелительном наклонении.",
  },
  {
    slug: "wasala",
    arabic: "وَصَلَ",
    russian: "прибывать, добираться",
    note: "Глагол с начальной слабой و: в настоящем времени и повелительном наклонении و исчезает — يَصِلُ, صِلْ.",
    tip: "В масдаре و возвращается на место: وُصُولٌ («прибытие» — это слово часто видно в аэропортах).",
  },
  {
    slug: "badaa",
    arabic: "بَدَأَ",
    russian: "начинать",
    note: "Глагол с конечной хамзой: в настоящем времени сохраняет фатху (يَبْدَأُ) и часто вводит начало действия.",
    tip: "Сравните спряжение с قَرَأَ: те же правила записи хамзы на алифе, вав и йа в разных лицах.",
  },
  {
    slug: "talaba",
    arabic: "طَلَبَ",
    russian: "просить, требовать",
    note: "Правильный глагол I породы с даммой в настоящем времени (يَطْلُبُ); часто употребляется в быту и учёбе.",
    tip: "От корня ط ل ب образовано слово طَالِبٌ («студент, ученик» — буквально «ищущий знание») и طَلَبٌ («просьба, заказ»).",
  },
  {
    slug: "sakana",
    arabic: "سَكَنَ",
    russian: "жить, обитать",
    note: "Используется для обозначения места жительства (обычно с предлогом فِي); в настоящем времени — يَسْكُنُ.",
    tip: "Корень س ك ن связан и с покоем, и с жильём: от него же назван знак сукун (سُكُونٌ) и слово مَسْكَنٌ («жилище»).",
  },
  {
    slug: "arafa",
    arabic: "عَرَفَ",
    russian: "знать, узнавать",
    note: "Чаще обозначает знакомство с человеком, местом или фактом; в настоящем времени имеет кясру — يَعْرِفُ.",
    tip: "Полезно различать عَلِمَ («знать как знание/информацию») и عَرَفَ («знать, быть знакомым, узнавать»).",
  },
  {
    slug: "hafiza",
    arabic: "حَفِظَ",
    russian: "запоминать, учить наизусть, хранить",
    note: "Глагол модели فَعِلَ — يَفْعَلُ: используется для заучивания слов, текстов и бережного хранения.",
    tip: "От корня ح ف ظ происходит слово حِفْظٌ («запоминание, сохранность») и مِحْفَظَةٌ («кошелёк, портфель»).",
  },
  {
    slug: "nama",
    arabic: "نَامَ",
    russian: "спать",
    note: "Пустой глагол (корень ن و م) с редкой особенностью: в настоящем времени звучит долгий алиф — يَنَامُ, а в 1–2-м лице прошедшего — кясра (نِمْتُ).",
    tip: "Не путайте с قَالَ → قُلْتُ: у نَامَ при сокращении появляется кясра (نِمْتُ, نِمْ), а в масдаре звучит نَوْمٌ («сон»).",
  },
  {
    slug: "raa",
    arabic: "رَأَى",
    russian: "видеть",
    note: "Неправильный глагол со средней хамзой и конечной слабой ي: в настоящем времени хамза выпадает — يَرَى.",
    tip: "Одно из самых коротких повелительных наклонений в языке: ед. ч. муж. р. — просто رَ («смотри, видь!»).",
  },
  {
    slug: "laiba",
    arabic: "لَعِبَ",
    russian: "играть",
    note: "Правильный глагол модели فَعِلَ — يَفْعَلُ: кясра в прошедшем времени и фатха в настоящем (يَلْعَبُ).",
    tip: "От корня ل ع ب образованы слова لُعْبَةٌ («игрушка, игра») и مَلْعَبٌ («стадион, площадка»).",
  },
  {
    slug: "shakara",
    arabic: "شَكَرَ",
    russian: "благодарить",
    note: "Правильный глагол с даммой в настоящем времени (يَشْكُرُ); источник самого известного слова благодарности.",
    tip: "Слово شُكْرًا («спасибо») — это винительный падеж масдара شُكْرٌ от глагола شَكَرَ.",
  },
  {
    slug: "hamala",
    arabic: "حَمَلَ",
    russian: "нести, носить",
    note: "Правильный глагол с кясрой в настоящем времени (يَحْمِلُ) и повелительном наклонении (اِحْمِلْ).",
    tip: "Корень ح م ل встречается и в современных словах, например مَحْمُولٌ («переносной, мобильный»).",
  },
  {
    slug: "ghasala",
    arabic: "غَسَلَ",
    russian: "мыть, стирать",
    note: "Бытовой правильный глагол модели فَعَلَ — يَفْعِلُ с кясрой в настоящем времени (يَغْسِلُ).",
    tip: "Однокоренное слово غَسَّالَةٌ («стиральная машина») помогает запомнить и значение, и корень غ س ل.",
  },
  {
    slug: "sabara",
    arabic: "صَبَرَ",
    russian: "терпеть, проявлять выдержку",
    note: "Правильный глагол с кясрой в настоящем времени (يَصْبِرُ); часто употребляется с предлогом عَلَى.",
    tip: "Масдар صَبْرٌ («терпение, стойкость») и форма повелительного اِصْبِرْ («терпи») встречаются в фусхе повсюду.",
  },

  // Порода II — удвоение средней коренной (فَعَّلَ — يُفَعِّلُ)
  {
    slug: "allama",
    arabic: "عَلَّمَ",
    russian: "учить, обучать",
    note: "II порода от عَلِمَ («знать»): удвоение средней коренной превращает «знать» в «передавать знание, обучать».",
    tip: "Все глаголы II породы в настоящем времени начинаются с даммы на приставке: أُعَلِّمُ، يُعَلِّمُ, а причастие — مُعَلِّمٌ («учитель»).",
  },
  {
    slug: "darrasa",
    arabic: "دَرَّسَ",
    russian: "преподавать",
    note: "II порода от دَرَسَ («изучать»): если ученик يَدْرُسُ, то преподаватель يُدَرِّسُ.",
    tip: "Шадда на ر меняет смысл кардинально: دَرَسَ — «учил сам», دَرَّسَ — «преподавал другим».",
  },
  {
    slug: "fakkara",
    arabic: "فَكَّرَ",
    russian: "думать, размышлять",
    note: "Частый глагол II породы; обычно употребляется с предлогом فِي («думать о чём-то»).",
    tip: "По шаблону II породы легко строить всю цепочку: فَكَّرَ — يُفَكِّرُ — فَكِّرْ — تَفْكِيرٌ («мышление»).",
  },
  {
    slug: "kallama",
    arabic: "كَلَّمَ",
    russian: "говорить с кем-то, обращаться",
    note: "Переходный глагол II породы: принимает прямое дополнение без предлога (كَلَّمْتُهُ — «я поговорил с ним»).",
    tip: "Сравните с V породой تَكَلَّمَ («разговаривать, владеть языком»): обе опираются на корень ك ل م, как и كَلِمَةٌ («слово»).",
  },

  // Порода III — долгий алиф после первой коренной (فَاعَلَ — يُفَاعِلُ)
  {
    slug: "safara",
    arabic: "سَافَرَ",
    russian: "путешествовать, ехать в поездку",
    note: "Классический глагол III породы: приставка настоящего времени всегда несёт дамму — يُسَافِرُ.",
    tip: "От этого глагола образовано частое слово مُسَافِرٌ («путешественник, пассажир» — с даммой на мим!).",
  },
  {
    slug: "saada",
    arabic: "سَاعَدَ",
    russian: "помогать",
    note: "Переходный глагол III породы: в арабском «помогать кому-то» строится без предлога — يُسَاعِدُ صَدِيقَهُ.",
    tip: "Шаблон III породы предсказуем: سَاعَدَ — يُسَاعِدُ — سَاعِدْ — مُسَاعَدَةٌ («помощь»).",
  },
  {
    slug: "shahada",
    arabic: "شَاهَدَ",
    russian: "смотреть, наблюдать",
    note: "III порода от корня ش ه د: используется для просмотра видео, фильмов, событий и наблюдения.",
    tip: "Если نَظَرَ — это «взглянуть на что-то», то شَاهَدَ — «смотреть продолжительно, наблюдать».",
  },

  // Порода IV — префикс أَ (أَفْعَلَ — يُفْعِلُ)
  {
    slug: "arada",
    arabic: "أَرَادَ",
    russian: "хотеть, желать",
    note: "Один из самых нужных глаголов IV породы (пустой корень ر و د): в настоящем времени يُرِيدُ.",
    tip: "Форма أُرِيدُ («я хочу») часто соединяется с частицей أَنْ + глагол: أُرِيدُ أَنْ أَقْرَأَ («я хочу почитать»).",
  },
  {
    slug: "ahabba",
    arabic: "أَحَبَّ",
    russian: "любить",
    note: "Удвоенный глагол IV породы (корень ح ب ب): перед согласными окончаниями удвоение распадается — أَحْبَبْتُ.",
    tip: "В настоящем времени форма компактна и удобна: أُحِبُّ («я люблю»), تُحِبُّ («ты любишь»), يُحِبُّ («он любит»).",
  },
  {
    slug: "arsala",
    arabic: "أَرْسَلَ",
    russian: "посылать, отправлять",
    note: "Правильный глагол IV породы: образец модели أَفْعَلَ — يُفْعِلُ — أَفْعِلْ — إِفْعَالٌ.",
    tip: "Корень ر س ل даёт привычные слова رِسَالَةٌ («сообщение, письмо») и إِرْسَالٌ («отправка»).",
  },
  {
    slug: "ata",
    arabic: "أَعْطَى",
    russian: "давать, вручать",
    note: "Недостаточный глагол IV породы (корень ع ط و): может принимать сразу два прямых дополнения (кому и что).",
    tip: "В повелительном наклонении конечная гласная усекается до кясры: أَعْطِ («дай!»).",
  },

  // Порода V — возвратность к II породе (تَفَعَّلَ — يَتَفَعَّلُ)
  {
    slug: "taallama",
    arabic: "تَعَلَّمَ",
    russian: "учиться, изучать",
    note: "V порода от корня ع ل م: в отличие от II породы عَلَّمَ («учить других»), означает «учиться самому».",
    tip: "В V породе приставка настоящего времени носит фатху (يَتَعَلَّمُ), а не дамму — это надёжный ориентир.",
  },
  {
    slug: "takallama",
    arabic: "تَكَلَّمَ",
    russian: "разговаривать, говорить",
    note: "Базовый глагол общения V породы; часто употребляется для обозначения владения языком — أَتَكَلَّمُ الْعَرَبِيَّةَ.",
    tip: "Запомните шаблон V породы: تَكَلَّمَ — يَتَكَلَّمُ — تَكَلَّمْ — تَكَلُّمٌ (везде шадда на средней букве).",
  },
  {
    slug: "tadhakkara",
    arabic: "تَذَكَّرَ",
    russian: "вспоминать, помнить",
    note: "Правильный глагол V породы от корня ذ ك ر («память, упоминание»).",
    tip: "У глаголов V породы прошедшее и повелительное различаются лишь концовкой: تَذَكَّرَ («вспомнил») и تَذَكَّرْ («вспомни!»).",
  },

  // Порода VI — взаимное действие (تَفَاعَلَ — يَتَفَاعَلُ)
  {
    slug: "taawana",
    arabic: "تَعَاوَنَ",
    russian: "сотрудничать, помогать друг другу",
    note: "Характерный пример VI породы: приставка تَ + долгий алиф передают взаимность действия.",
    tip: "В VI породе, как и в V, все гласные основы в настоящем времени — фатхи: يَتَعَاوَنُ.",
  },

  // Порода VII — возвратно-страдательное значение (اِنْفَعَلَ — يَنْفَعِلُ)
  {
    slug: "intalaqa",
    arabic: "اِنْطَلَقَ",
    russian: "отправляться, пускаться в путь",
    note: "Глагол VII породы с приставкой اِنْـ: обозначает движение, старт или начало процесса без внешнего деятеля.",
    tip: "Признак VII породы — устойчивый слог نْ перед первой коренной: اِنْطَلَقَ — يَنْطَلِقُ — اِنْطِلَاقٌ.",
  },

  // Порода VIII — инфикс ت после первой коренной (اِفْتَعَلَ — يَفْتَعِلُ)
  {
    slug: "intazara",
    arabic: "اِنْتَظَرَ",
    russian: "ждать, ожидать",
    note: "VIII порода от корня ن ظ ر («смотреть»): переходный глагол, не требует предлога («ждать кого-то/что-то»).",
    tip: "Не путайте с VII породой: здесь ن — первая буква корня ن ظ ر, а добавлена буква ت после неё (اِنْتَظَرَ).",
  },
  {
    slug: "ishtara",
    arabic: "اِشْتَرَى",
    russian: "покупать",
    note: "Недостаточный глагол VIII породы (корень ش ر ي): один из главных бытовых глаголов в фусхе.",
    tip: "В настоящем времени оканчивается на долгую ي (يَشْتَرِي), а в повелительном усекается до اِشْتَرِ («купи!»).",
  },
  {
    slug: "ijtamaa",
    arabic: "اِجْتَمَعَ",
    russian: "собираться, встречаться",
    note: "Правильный глагол VIII породы от корня ج م ع («собирать, объединять»).",
    tip: "От того же корня происходят слова جَامِعَةٌ («университет»), جَمْعٌ («множественное число») и اِجْتِمَاعٌ («собрание»).",
  },
  {
    slug: "istamaa",
    arabic: "اِسْتَمَعَ",
    russian: "слушать, вслушиваться",
    note: "VIII порода от корня س م ع (не X!): буква س здесь корневая, а глагол обычно требует предлога إِلَى.",
    tip: "Частая ловушка: اِسْتَمَعَ выглядит как X порода, но его корень — س م ع, поэтому это VIII порода (اِفْتَعَلَ).",
  },

  // Порода X — приставка اِسْتَـ (اِسْتَفْعَلَ — يَسْتَفْعِلُ)
  {
    slug: "istataa",
    arabic: "اِسْتَطَاعَ",
    russian: "мочь, быть в состоянии",
    note: "Пустой глагол X породы (корень ط و ع): один из самых употребительных модальных глаголов в фусхе.",
    tip: "Как и у пустых глаголов, долгий алиф исчезает перед сукуном: اِسْتَطَعْتُ («я смог»), а в настоящем звучит يَسْتَطِيعُ.",
  },
  {
    slug: "istakhdama",
    arabic: "اِسْتَخْدَمَ",
    russian: "использовать, применять",
    note: "Образцовый правильный глагол X породы: чётко показывает приставку اِسْتَـ и модель اِسْتَفْعَلَ — يَسْتَفْعِلُ.",
    tip: "Корень خ د م («служить») с приставкой X породы اِسْتَـ даёт значение «привлекать к службе, использовать».",
  },
  {
    slug: "istaghfara",
    arabic: "اِسْتَغْفَرَ",
    russian: "просить прощения",
    note: "Классический пример значения X породы — «просить о действии корня» (غ ف ر — «прощать» → «просить прощения»).",
    tip: "Запомните этот глагол как ключ к смыслу X породы: приставка اِسْتَـ часто добавляет оттенок просьбы или поиска.",
  },
];

const PERSONS_14: readonly [string, string][] = [
  ["Я", "أَنَا"],
  ["Мы", "نَحْنُ"],
  ["Ты (муж.)", "أَنْتَ"],
  ["Вы двое (муж.)", "أَنْتُمَا"],
  ["Вы (муж.)", "أَنْتُمْ"],
  ["Ты (жен.)", "أَنْتِ"],
  ["Вы двое (жен.)", "أَنْتُمَا"],
  ["Вы (жен.)", "أَنْتُنَّ"],
  ["Он", "هُوَ"],
  ["Они двое (муж.)", "هُمَا"],
  ["Они (муж.)", "هُمْ"],
  ["Она", "هِيَ"],
  ["Они двое (жен.)", "هُمَا"],
  ["Они (жен.)", "هُنَّ"],
];

const PERSONS_6: readonly [string, string][] = [
  ["Ты (муж.)", "أَنْتَ"],
  ["Вы двое (муж.)", "أَنْتُمَا"],
  ["Вы (муж.)", "أَنْتُمْ"],
  ["Ты (жен.)", "أَنْتِ"],
  ["Вы двое (жен.)", "أَنْتُمَا"],
  ["Вы (жен.)", "أَنْتُنَّ"],
];

function stripHarakat(value: string): string {
  return value.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
}

/** Приводит огласовки к строгому канону: добавляет сукун на конечной م в окончании ـتُمْ. */
function normalizeExportedForm(value: string): string {
  return value
    .normalize("NFC")
    .replace(/تُم$/u, "تُمْ")
    .replace(/\u0670/gu, "");
}

interface VerbRow {
  arabic_lemma: string;
  arabic_verb: string;
  root: string;
  russian: string;
  past: string;
  present: string;
  imperative: string;
}

interface WordFamilyRow {
  masdar_ar: string | null;
  masdar_ru: string | null;
}

export interface ConjugationRow {
  person: string;
  pronoun: string;
  form: string;
}

export interface WebVerb {
  slug: string;
  arabic: string;
  plain: string;
  present3m: string;
  imperative2m: string;
  masdar: string;
  masdarRu: string;
  root: string;
  rootCompact: string;
  form: number;
  formRoman: string;
  russian: string;
  note: string;
  tip: string;
  past: ConjugationRow[];
  present: ConjugationRow[];
  imperative: ConjugationRow[];
}

function main() {
  const verbsDb = new Database(VERBS_DB_PATH, { readonly: true });
  const wfDb = new Database(WORD_FAMILIES_DB_PATH, { readonly: true });

  const findExact = verbsDb.query<VerbRow, [string]>(
    "SELECT arabic_lemma, arabic_verb, root, russian, past, present, imperative FROM verbs WHERE arabic_verb = ?",
  );
  const findByLemma = verbsDb.query<VerbRow, [string]>(
    "SELECT arabic_lemma, arabic_verb, root, russian, past, present, imperative FROM verbs WHERE arabic_lemma = ?",
  );
  const findMasdar = wfDb.query<WordFamilyRow, [string, string, number]>(
    `SELECT vf.masdar_ar, vf.masdar_ru
     FROM verb_forms vf
     JOIN roots r ON r.id = vf.root_id
     WHERE (r.root_ar = ? OR r.root_key = ?) AND vf.form_number = ?
     LIMIT 1`,
  );

  const exported: WebVerb[] = [];
  const seenSlugs = new Set<string>();

  for (const spec of CURATED_VERBS) {
    if (seenSlugs.has(spec.slug)) {
      throw new Error(`Duplicate verb slug: ${spec.slug}`);
    }
    seenSlugs.add(spec.slug);

    let row = findExact.get(spec.arabic);
    if (!row) {
      const candidates = findByLemma.all(stripHarakat(spec.arabic));
      row = candidates.find((item) => item.arabic_verb.normalize("NFC") === spec.arabic.normalize("NFC")) ?? candidates[0] ?? null;
    }
    if (!row) {
      throw new Error(`Verb not found in verbs.sqlite: ${spec.arabic} (${spec.slug})`);
    }

    const form = verbFormNumber(row.arabic_verb, row.root);
    if (!form) {
      throw new Error(`Could not determine verb form for ${row.arabic_verb} (${row.root})`);
    }

    const rootCompact = row.root.replace(/\s+/g, "");
    const rootKey = rootCompact.replace(/[أإآ]/g, "ا");
    const wfRow = findMasdar.get(rootCompact, rootKey, form);
    if (!wfRow?.masdar_ar) {
      throw new Error(`Masdar not found in word_families.sqlite for ${row.arabic_verb} (root ${row.root}, form ${form})`);
    }

    const rawPast = JSON.parse(row.past) as string[];
    const rawPresent = JSON.parse(row.present) as string[];
    const rawImperative = JSON.parse(row.imperative) as string[];

    if (rawPast.length !== 14 || rawPresent.length !== 14 || rawImperative.length !== 6) {
      throw new Error(`Unexpected conjugation row lengths for ${row.arabic_verb}`);
    }

    const past: ConjugationRow[] = rawPast.map((formText, index) => ({
      person: PERSONS_14[index]![0],
      pronoun: PERSONS_14[index]![1],
      form: normalizeExportedForm(formText),
    }));
    const present: ConjugationRow[] = rawPresent.map((formText, index) => ({
      person: PERSONS_14[index]![0],
      pronoun: PERSONS_14[index]![1],
      form: normalizeExportedForm(formText),
    }));
    const imperative: ConjugationRow[] = rawImperative.map((formText, index) => ({
      person: PERSONS_6[index]![0],
      pronoun: PERSONS_6[index]![1],
      form: normalizeExportedForm(formText),
    }));

    const arabic = normalizeExportedForm(row.arabic_verb);
    const masdar = normalizeExportedForm(wfRow.masdar_ar);
    const masdarRu = (wfRow.masdar_ru ?? "")
      .replace(/\s+/g, " ")
      .replace(/\bучеба\b/g, "учёба")
      .trim();

    exported.push({
      slug: spec.slug,
      arabic,
      plain: stripHarakat(arabic),
      present3m: present[8]!.form,
      imperative2m: imperative[0]!.form,
      masdar,
      masdarRu,
      root: row.root.trim(),
      rootCompact,
      form,
      formRoman: VERB_FORM_NUMERALS[form - 1]!,
      russian: spec.russian,
      note: spec.note,
      tip: spec.tip,
      past,
      present,
      imperative,
    });
  }

  verbsDb.close();
  wfDb.close();

  const header = `/**
 * 58 частотных арабских глаголов с полными таблицами спряжения (14 строк, 13
 * различающихся форм) из офлайн-каталогов Acrab (\`verbs.sqlite\` и
 * \`word_families.sqlite\`).
 *
 * Файл сгенерирован автоматически скриптом \`website/tools/export-web-verbs.ts\`.
 * Не правьте руками — обновляйте через \`bun run website/tools/export-web-verbs.ts\`.
 */

export interface ConjugationRow {
  person: string;
  pronoun: string;
  form: string;
}

export interface WebVerb {
  slug: string;
  arabic: string;
  plain: string;
  present3m: string;
  imperative2m: string;
  masdar: string;
  masdarRu: string;
  root: string;
  rootCompact: string;
  form: number;
  formRoman: string;
  russian: string;
  note: string;
  tip: string;
  past: readonly ConjugationRow[];
  present: readonly ConjugationRow[];
  imperative: readonly ConjugationRow[];
}

export const VERB_SECTION_PATH = "/arabic-verbs/";
export const VERB_PUBLISHED = "2026-11-24";
export const VERB_MODIFIED = "2026-11-24";

export const WEB_VERBS: readonly WebVerb[] = ${JSON.stringify(exported, null, 2)} as const;

const VERB_BY_SLUG = new Map<string, WebVerb>(WEB_VERBS.map((verb) => [verb.slug, verb]));

export function verbPath(slug: string): string {
  return \`\${VERB_SECTION_PATH}\${slug}/\`;
}

export function verbBySlug(slug: string): WebVerb | undefined {
  return VERB_BY_SLUG.get(slug);
}

/** Снимает огласовки и унифицирует варианты алифа для поиска. */
export function normalizeArabicSearch(value: string): string {
  return value
    .replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/\\s+/g, "")
    .trim();
}

/** Поиск глаголов по русскому значению, арабской записи (с огласовками или без) или корню. */
export function filterWebVerbs(
  verbs: readonly WebVerb[],
  query: string,
  formFilter: "all" | "1" | "derived" = "all",
): WebVerb[] {
  const byForm = verbs.filter((verb) => {
    if (formFilter === "1") return verb.form === 1;
    if (formFilter === "derived") return verb.form > 1;
    return true;
  });
  const trimmed = query.trim();
  if (!trimmed) return byForm;

  const ruNeedle = trimmed.toLowerCase().replace(/ё/g, "е");
  const arNeedle = normalizeArabicSearch(trimmed);

  return byForm.filter((verb) => {
    const ruHaystack = \`\${verb.russian} \${verb.masdarRu}\`.toLowerCase().replace(/ё/g, "е");
    if (ruHaystack.includes(ruNeedle)) return true;
    if (!arNeedle) return false;
    const arFields = [
      verb.plain,
      verb.present3m,
      verb.imperative2m,
      verb.masdar,
      verb.rootCompact,
    ].map(normalizeArabicSearch);
    return arFields.some((field) => field.includes(arNeedle));
  });
}

/** Похожие и однокоренные глаголы для перелинковки на странице глагола. */
export function relatedVerbsFor(verb: WebVerb, limit = 6): WebVerb[] {
  const sameRoot = WEB_VERBS.filter((item) => item.slug !== verb.slug && item.rootCompact === verb.rootCompact);
  const sameForm = WEB_VERBS.filter(
    (item) => item.slug !== verb.slug && item.rootCompact !== verb.rootCompact && item.form === verb.form,
  );
  const index = WEB_VERBS.findIndex((item) => item.slug === verb.slug);
  const rotated = [...sameForm.slice(index % Math.max(1, sameForm.length)), ...sameForm.slice(0, index % Math.max(1, sameForm.length))];
  return [...sameRoot, ...rotated].slice(0, limit);
}

export function verbTitle(verb: WebVerb): string {
  return \`Спряжение глагола \${verb.arabic} (\${verb.russian}) в арабском | Acrab\`;
}

export function verbDescription(verb: WebVerb): string {
  return \`Полная таблица спряжения арабского глагола \${verb.arabic} («\${verb.russian}», \${verb.formRoman} порода, корень \${verb.root}): прошедшее, настоящее и повелительное время с огласовками.\`;
}
`;

  writeFileSync(OUTPUT_PATH, header, "utf8");
  console.log(`Exported ${exported.length} verbs to ${OUTPUT_PATH}`);
}

main();
