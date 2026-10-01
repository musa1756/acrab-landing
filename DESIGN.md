---
name: Acrab
description: Сайт в дизайн-системе приложения Акраб — те же цвета, шрифт, кнопки с ребром, плитки и движения.
source: mobile/src/components/acrab/ (tokens.ts, semanticTokens.ts, PrimaryButton.tsx, PremiumTileKit.tsx, motion.ts); файл Figma Acrab_UI собран из того же кода
colors:
  brand: "#d4a854"
  brand-strong: "#cca642"
  brand-text: "#86691f"
  text: "#242b38"
  text-secondary: "#636e80"
  text-tertiary: "#8e8e93"
  surface: "#ffffff"
  surface-warm: "#fcf7ed"
  selected-face: "#fdf6e7"
  line: "#e6e3dc"
  edge-neutral: "#d9d5cc"
  line-strong: "#d1d1d6"
  hairline: "rgba(0, 0, 0, 0.08)"
typography:
  rounded:
    fontFamily: "ui-rounded, SF Pro Rounded, Acrab Rounded (Nunito), system sans-serif"
    use: "заголовки, надписи кнопок, чипы, цены"
  text:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, sans-serif"
    use: "основной текст"
  arabic:
    fontFamily: "SF Arabic, Geeza Pro, Noto Naskh Arabic, Al Bayan, serif"
  scale: "34/41 · 28/34 · 22/27 · 20/25 · 17/22 · 16/22 · 15/20 · 14/19 · 13/18 · 12/16 · 11/14; жирности 400 · 600 · 700"
rounded:
  sm: "8px"
  control: "12px"
  tile: "16px"
  surface: "20px"
  pill: "999px"
shadows:
  low: "0 1px 3px #00000014"
  mid: "0 2px 16px #00000014"
  high: "0 4px 20px #00000014"
  overlay: "0 8px 32px #00000029"
motion:
  press: "лицо опускается на ребро 3 px: 50 мс вниз, 100 мс вверх, cubic-bezier(0, 0, .58, 1)"
  appear: "прозрачность, сдвиг 18 px и масштаб .95, пружина response .32 / damping 1, лесенка 60 мс"
  select: "пружина response .2 / damping .8"
---

# Дизайн сайта: система приложения

С 1 октября 2026 года сайт оформлен дизайн-системой приложения Акраб. Владелец
попросил перенести её «один в один»: те же кнопки, шрифты, анимации, таблица
сравнения Free и Premium как на экране оплаты. Источник значений — код
приложения в `mobile/src/components/acrab/`; файл Figma «Acrab_UI» собран из
того же кода плагином `packages/figma-design-system`.

## Где что лежит

- `src/styles/tokens.css` — токены приложения один к одному: цвета ролей
  (`--c-*`), восемь ступеней прозрачного золота (`--gold-06…--gold-70`),
  скругления, рамки, тени, шкала текста, движение. Внизу — прежние имена сайта
  (`--ink`, `--gold-text`…) как синонимы новых значений.
- `src/styles/kit.css` — компоненты приложения: кнопка действия, круглая кнопка
  значка, плитка с ребром, карточка, чип, метки, значок строки, появление.
- `src/styles/base.css` — фон, шапка, заголовки, подвал, ссылки на магазины.
- Файлы разделов: `changelog.css`, `panels.css`, `buy.css`, `support.css`,
  `home.css`, `guides.css`, `keyboard.css`. Порядок импорта в `global.css` —
  порядок каскада.
- `src/components/Icon.astro` и `src/lib/phosphor.ts` — значки.
- `src/scripts/appear.ts` — появление блоков при прокрутке.

## Шрифт

Приложение пишет заголовки и надписи кнопок SF Pro Rounded, текст — SF Pro
Text, арабский — SF Arabic. Раздавать шрифты Apple с сайта лицензия не
разрешает, поэтому круглый шрифт подключён цепочкой: `ui-rounded` (на iPhone,
iPad и Mac в Safari это и есть SF Pro Rounded), затем установленный SF Pro
Rounded, затем «Acrab Rounded» — свободный Nunito (OFL, файлы и лицензия в
`public/assets/fonts/`). Текст — системный шрифт (на устройствах Apple это
SF Pro Text). Арабский — SF Arabic там, где он есть, иначе прежние запасные.

## Значки

Приложение рисует SF Symbols. Их лицензия запрещает показ вне платформ Apple,
поэтому сайт берёт ближайший рисунок Phosphor Icons в начертании Fill (MIT) —
тот же набор приложение использует для инструментов. Добавить значок —
инструкция в шапке `src/lib/phosphor.ts`.

## Компоненты

### Кнопка действия — `.btn` (`AcrabPrimaryButton`)

Лицо, под ним ребро 3 px темнее заливки на 22 %. Нажатие опускает лицо на
ребро; при уменьшении движения кнопка не двигается. Тоны: `.btn` — золотая
кнопка действия; `.btn-outline` — вторая кнопка: белое лицо, песочная рамка 2,
золотая надпись; `.btn-outline-gold`; `.btn-outline-premium` — покупка Premium
тёмным золотом; `.btn-plain`, `.btn-soft`, `.btn-quiet`. Размеры: обычный
(скругление 12, лицо 50 px, надпись 17/600), `.btn-dense`, `.btn-compact` и
`.btn-small` — пилюли 44 и 34, `.btn-circle`. Выбранная — `.is-selected` или
`aria-pressed="true"`.

Ссылки на магазины (`.store-link`) — та же вторая кнопка с ребром и нажатием.

### Плитки и карточки

- `.tile` — `TileSurface`: лицо, рамка 2, ребро 3, скругление 16. Ссылка или
  кнопка-плитка нажимается как кнопка. Варианты `.tile-gold`, `.tile-neutral`,
  `.tile-selected`.
- `.card` — `RaisedTileSurface`: рамка 2 (золото), скругление 20, без ребра.
  `.card-plain` — белая карточка с тенью high, как карточки Программы.
- `.panel` — белая карточка страниц оплаты и помощи.

### Мелкие элементы

`.chip` (`AcrabChip`), `.gain` (метки «x10», «∞»), `.badge` (бейдж тарифа),
`.icon-badge` (значок строки 30×30 на золоте .12), `.icon-btn`
(`HeaderIconButton`). Надзаголовок страницы `.eyebrow` — чип.

### Шапка

Полупрозрачная панель с размытием, разделы — чипы, текущий раздел —
выбранный чип. На телефоне пять разделов помещаются в 343 px.

## Движение

- Нажатие: 50 мс вниз, 100 мс вверх, `cubic-bezier(0, 0, .58, 1)` —
  `pressDepthGeometry.ts`.
- Появление (`Appear`): `data-appear` на блоке или `data-appear-group` на
  контейнере. Пружина snappy (response .32, damping 1) посчитана в CSS
  `linear()`; лесенка 60 мс. Скрипт прячет только то, что ниже первого
  экрана, поэтому без скрипта страница видна целиком.
- Выбор (тариф, вариант): пружина micro (response .2, damping .8).
- `prefers-reduced-motion`: без сдвигов, появление — прозрачность за 160 мс,
  как в приложении.

## Правила

- Значение берётся из токена. Новый цвет допустим только как контентная
  палитра, которая и в приложении своя (цвета инструментов и тренировок).
- У элемента страницы есть аналог в приложении; если нет — он собирается из
  компонентов kit.css, а не придумывается.
- Не использовать: нумерацию разделов «01 / 02», моноширинные подписи,
  капитель как надзаголовок, тёмные блоки-призывы, градиентный текст, стекло
  вне шапки, обводку 1 px там, где у приложения рамка 2 и ребро.
- Мелкий текст по делу — не светлее `--c-text-secondary` на белом.
- Атрибут `style` в разметке запрещён CSP — только классы.
- Реальные снимки экранов остаются доказательством: рамка — скругление 20 и
  тень high.
