/**
 * Отзывы о приложении из магазинов — для ленты на главной.
 *
 * Откуда: публичные страницы Acrab в App Store и Google Play, без входа в
 * аккаунт. Дата сбора: 4 октября 2026.
 *
 * Тексты, заголовки и имена авторов — дословно, как опубликованы: опечатки,
 * регистр, пунктуация и эмодзи не исправлены, ничего не добавлено и не убрано.
 * Берутся автор, дата, оценка, заголовок (у отзывов Google Play его нет) и
 * текст; страна магазина и версия приложения не нужны.
 * Порядок показа: магазины чередуются, внутри магазина новые отзывы первыми.
 *
 * Пропущены (список SKIPPED_REVIEWS внизу): два отзыва Google Play — вопрос о
 * пропадающем звуке (не отзыв о приложении) и отзыв из одного значка ♥️.
 *
 * Оценки магазинов (STORE_RATINGS) — со страниц на ту же дату. Число оценок
 * не хранится: оно устаревает.
 */

export type ReviewStore = "App Store" | "Google Play";

export interface StoreReview {
  store: ReviewStore;
  author: string;
  /** Дата отзыва в магазине, ГГГГ-ММ-ДД. */
  date: string;
  /** Оценка от 1 до 5. */
  rating: number;
  /** Заголовок отзыва; в Google Play его нет. */
  title?: string;
  text: string;
}

export const STORE_REVIEWS: readonly StoreReview[] = [
  {
    store: "Google Play",
    author: "Мухтар Хутов",
    date: "2026-09-27",
    rating: 5,
    text: "отличное приложение рекомендую",
  },
  {
    store: "App Store",
    author: "Анна хех",
    date: "2026-09-19",
    rating: 5,
    title: "Не пожалеете!",
    text: "Очень хорошо объясняет все понятно и легко учить !!!",
  },
  {
    store: "Google Play",
    author: "Әділхан Әлімхан",
    date: "2026-09-20",
    rating: 5,
    text: "пусть это приложение будет на мировом уровне Амин",
  },
  {
    store: "App Store",
    author: "Али Юрий",
    date: "2026-09-17",
    rating: 5,
    title: "Лучшее приложение в нете",
    text: "Я давно искал такое приложение. Джазакалаху хайран разработчику!",
  },
  {
    store: "Google Play",
    author: "Андрей Петрович",
    date: "2026-09-12",
    rating: 5,
    text: "Очень классная программа для изучение арабского языка, Пусть Всевышний будет доволен тобою за то что создал такую программу, какие только я не пробовал не то было либо надо было покупать за космические суммы. Но ты всех порвал я буду всем своим друзьям предлагать",
  },
  {
    store: "App Store",
    author: "Muaz.09",
    date: "2026-08-25",
    rating: 5,
    title: "👍",
    text: "Очень полезное приложение",
  },
  {
    store: "Google Play",
    author: "Muhammadisa Abdulrhman",
    date: "2026-09-07",
    rating: 5,
    text: "Приложение отличная!!! Я очень много времени ждал, когда же выйдет acrab в google play И наконец то оно вышло🥳 Я очень рад что оно теперь есть в app store и в google play Скачайте приложение, всем советую!!",
  },
];

export interface StoreRating {
  store: ReviewStore;
  /** Средняя оценка со страницы магазина. */
  rating: number;
}

export const STORE_RATINGS: readonly StoreRating[] = [
  { store: "App Store", rating: 4.89 },
  { store: "Google Play", rating: 4.9 },
];

/** Что не попало в STORE_REVIEWS и почему. */
export const SKIPPED_REVIEWS: readonly string[] = [
  "Google Play, Илюся Гайнутдинова: вопрос о пропадающем звуке, не отзыв о приложении",
  "Google Play, Asqar Xudayberganov: отзыв состоит только из значка ♥️, текста нет",
];
