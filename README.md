# Acrab Landing

Статический сайт Acrab на Astro 7. Исходник — `src/` и `public/`; `bun run build`
генерирует страницы в `site/`, и именно этот каталог раздаёт acrab.ru. Node.js или
Bun на production не требуются. С 24 сентября 2026 рукописных страниц больше нет:
`site/` — только результат сборки, руками его не правят.

## Стек

- Bun 1.4
- Astro 7 в режиме SSG
- TypeScript со строгой проверкой
- Vite
- Tailwind CSS 4 без Preflight; существующая визуальная система сохранена в
  глобальном CSS
- React 19 только для интерактивного payment island `/buy`
- небольшой клиентский TypeScript-модуль для platform redirect `/get`

Статические страницы не гидратируются. API, auth и webhook платежей остаются
внешними сервисами; секреты backend не попадают в `site/`.

## Команды

```bash
bun install --frozen-lockfile
bun run dev
bun run build
bun run preview
bun run typecheck
bun run test
bun run test:browser
bun run check
```

`bun run check` выполняет typecheck, unit-тесты, сборку в `site/` и проверку
итогового каталога. Проверку можно запустить отдельно после сборки:

```bash
python3 tools/check_site.py site
bun run verify:published   # закоммиченный site/ совпадает со сборкой
```

Browser smoke требует установленный Chromium для Playwright:

```bash
bunx playwright install chromium
bun run test:browser
```

## Структура

- `src/pages/` — статически генерируемые маршруты сайта.
- `src/components/` — SEO, шапка, подвал, магазинные ссылки и релизы.
- `src/layouts/` — общий, учебный и юридический layouts.
- `src/content/changelog/` — структурированные JSON-записи changelog.
- `src/features/payment/` — чистые модели, сообщения и API платежей.
- `src/features/payment/PaymentFlow.tsx` — запуск клиентского payment flow.
- `src/scripts/store-redirect.ts` — платформенный redirect `/get`.
- `src/styles/global.css` — сохранённая визуальная система и Tailwind utilities.
- `src/seo/schema.ts` — разметка schema.org: организация и сайт на главной, `Article` и `BreadcrumbList` статей (`GuideLayout` строит их из объекта `guide`), `FAQPage` вопросов.
- `src/components/GuideFaq.astro` и `GuideCta.astro` — блок «Частые вопросы» статьи (видимый текст и `FAQPage` из одного списка) и призыв скачать с тремя магазинами.
- `src/components/AudioButton.astro` и `src/scripts/phrase-audio.ts` — кнопка «Слушать» в статьях с фразами (`/arabic-hello/`, `/arabic-thank-you/`): `<button hidden>` с `data-audio`, скрипт показывает её и играет файл из `public/assets/audio/`. Файлы — копии озвучки приложения, найденной по тексту фразы в `mobile/src/features/fusha/recordings.ts`; у фразы без записи в приложении кнопки нет, новую озвучку для сайта не генерируют. Голос синтезированный: в тексте его не называют записью диктора или носителя. `tools/check_site.py` проверяет, что каждый `data-audio` указывает на файл сборки.
- `src/seo/letters.ts`, `src/seo/letter-words.ts` и `src/pages/arabic-alphabet/[letter].astro` — 28 страниц букв `/arabic-alphabet/<slug>/`, один маршрут через `getStaticPaths`. Названия, слоги, слова и переводы взяты из уроков приложения (`mobile/src/features/fusha/`), объяснения звука, ошибки русскоязычных и вопросы написаны для сайта; транскрипция слов — только здесь. Slug — латинское имя буквы, а у букв с одинаковым русским названием «тяжёлая» или гортанная получает `h` на конце: `ta`/`tah`, `zay`/`zah`, `ha`/`hah`; после публикации slug не меняют. Озвучка (буква, три слога, слова-примеры) лежит в `public/assets/audio/letters/`; копирует её из записей приложения `tools/sync-letter-audio.ts` (в монорепо: `cd website && bun run tools/sync-letter-audio.ts`), кнопки — тот же `AudioButton`. `src/lib/rich-arabic.ts` оборачивает арабские вставки текста в `lang="ar"`.
- `public/assets/`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt` и `public/favicon.ico` — файлы с неизменными публичными URL. Иконки страниц — уменьшенные копии `acrab-app-icon.png` (`acrab-icon-64/120/180.png`, `acrab-icon-512.jpg`); сам файл 1024 px на 1,5 МБ сохранён по прежнему адресу, но страницы его больше не грузят.
- `site/` — результат `bun run build`, который публикует Timeweb; коммитится вместе с исходниками.
- `tests/` и `tools/check_site.py` — проверки исходников и готового `site/`; `e2e/payment.smoke.ts` — браузерный smoke оплаты (`bun run test:browser`).

## Маршруты и SEO

Сохраняются маршруты `/`, `/about`, `/articles`, `/learn-arabic`, `/arabic-alphabet`,
`/arabic-vowels`, `/sun-moon-letters`, `/fusha`, `/arabic-app`, `/buy`,
`/support`, `/privacy`, `/offer`, `/consent`, `/get` и `/404.html`. Сборка использует directory-style output, поэтому
`/buy` остаётся совместим с directory redirect на `/buy/`.

`/buy`, `/offer`, `/consent` и `/get` обязаны оставаться `noindex` и не входят
в sitemap. Canonical индексируемых страниц заканчиваются `/`, кроме корня.
Внутренние ссылки и пути к публичным ресурсам остаются абсолютными.

При добавлении индексируемого маршрута одновременно обновляются:

1. страница в `src/pages/` и её SEO-поля; статья — на `GuideLayout` с объектом `guide` и блоком `GuideFaq`;
2. список URL в `public/sitemap.xml` и ссылка в `public/llms.txt`;
3. списки маршрутов в `tools/check_site.py` и `tests/site.test.ts`;
4. для статьи — запись в `src/seo/guides.ts`: из неё строятся раздел «Статьи» (`/articles/`), блок на главной и строка в подвале; в крошках статьи средний пункт — «Статьи».

При содержательной правке статьи меняются `dateModified` в её объекте `guide` и
`lastmod` в `public/sitemap.xml`: дата видна на странице как «Обновлено» и уходит
в разметку `Article`. Цены и числа программы в `llms.txt` сверяет `bun run test:facts`.

Страницы букв `/arabic-alphabet/<slug>/` — дочерние страницы хаба алфавита, а не статьи: в `public/sitemap.xml` перечислены все 28 (каждая — отдельный `<url>`), в `src/seo/guides.ts` их нет, и раздел «Статьи» остаётся списком статей, в `public/llms.txt` они описаны одной строкой хаба. Крошки — «Статьи › Арабский алфавит › Буква …». В `tools/check_site.py` список `LETTER_SLUGS` (тесты сверяют его с `src/seo/letters.ts`) делает страницы обязательными маршрутами и проверяет у каждой блоки, озвучку, соседние буквы и ссылку с хаба. Новая буква или слово — правка `src/seo/letters.ts`, затем `tools/sync-letter-audio.ts` и дополнение sitemap и `LETTER_SLUGS`.

## Кэш браузера

Timeweb не отдаёт `Cache-Control`, и браузер по своей эвристике показывает недавно
открытую страницу из кэша, не спрашивая сервер: после выкладки на части страниц
оставалась старая шапка. Поэтому каждая страница несёт номер сборки
(`<html data-build>`, хеш исходников `src/` и `public/` из `src/lib/build-id.ts`),
сервер отдаёт текущий в `/build.txt`, а `src/scripts/fresh-page.ts` при
расхождении один раз перезагружает страницу. Номер зависит только от содержимого,
поэтому повторная сборка даёт тот же `site/`. `tools/check_site.py` проверяет, что
`data-build` всех страниц совпадает с `build.txt`. Новая страница вне `BaseLayout`
должна подключить то же самое, как `/privacy`. Внутренние ссылки пишутся со слэшем
на конце (`/buy/`): адрес без слэша хостинг отдаёт постоянным редиректом 308.

## Аналитика

Яндекс Метрика, счётчик `113252004` в аккаунте владельца; данные принимаются только
с acrab.ru. Подключает `src/scripts/site-analytics.ts` (из `BaseLayout` и `/privacy`,
новая страница вне `BaseLayout` подключает его так же). Скрипт сам загружает `tag.js`
и при нажатии на ссылку магазина шлёт цель `store_appstore`, `store_googleplay` или
`store_rustore` и общую `store_click`; в Метрике это цели типа «JavaScript-событие»
с теми же идентификаторами. Вебвизор выключен на `/buy/`. Адреса Метрики разрешены
в CSP (`astro.config.mjs`: `script-src`, `img-src`, `connect-src` с `wss://`,
`frame-src`/`child-src` с `blob:`); после правки CSP открыть собранную страницу и
проверить консоль на нарушения. Состав данных Метрики описан в разделе 8 `/privacy`.
Установку приложения Метрика не видит — это App Store Connect и Play Console.

## Тексты

Тексты сайта вычитываются по навыку ru-text: инфостиль, обращение на «вы»
строчными, без канцелярита и примет машинного текста. Сайт называет всё так же,
как приложение:

- единица программы — «модуль», как в приложении; «N модулей/уроков» с числом не
  из каталога ловит `bun run test:facts`, он же сверяет цены на `/buy`, главной и в
  `llms.txt`;
- плитки инструментов на главной повторяют `TOOL_FEATURES` из
  `mobile/src/features/tools/ToolsScreen.tsx` (порядок, названия, подписи), цвета —
  `toolAccent`; названия тренировок — `mobile/src/features/fusha/training/mode.ts`;
- лимиты Free и Premium на главной и в таблице `/buy` — те же, что в
  `PremiumPaywall.tsx`; таблица `/buy` повторяет строки приложения дословно;
- страница поддержки в меню называется «Помощь»;
- оферта, политика и согласие — юридические тексты, их стиль не правится (см. ниже).

## Changelog

Каждый релиз хранится отдельным JSON-файлом в `src/content/changelog/`. Схема
описана в `src/content.config.ts`. Обязательны версия, дата, заголовок,
описание и массивы `new`, `improvements`, `fixes`. Поле `image` допускает
`null`; отсутствие изображения не ломает сборку. Страница сортирует релизы по
дате от новых к старым.

Изображения релизов размещаются в `public/assets/changelog/`.

## Оплата

`/buy` остаётся статическим Astro shell с React island. Сценарий: тарифы и
публичные цены видны сразу, без входа; выбор тарифа, затем email OTP
существующего аккаунта (код уходит только после отдельной галочки согласия на обработку персональных данных) и проверка кода только ради оплаты, чтение своей
подписки после кода, создание платежа кнопкой «Оплатить» и переход по
HTTPS-ссылке, которую вернула функция `tochka-payment`. Отдельного чекбокса оферты нет: нажатие «Оплатить» означает
принятие оферты, политики конфиденциальности и согласия на обработку данных —
тот же текст, что под кнопкой в приложении. Домен ссылки не проверяется по
списку: платёжные страницы банка живут не на `tochka.com`, проверяется только
HTTPS без логина и пароля, как в `decodePaymentSession` приложения.

Как и приложение, страница позволяет создавать оплату сколько угодно раз.
Вход и последняя ссылка «Точки» хранятся в `sessionStorage` вкладки (ключи
`acrab.checkout.session` и `acrab.checkout.pending`) до истечения токена и
серверного `expiresAt` ссылки: вернувшись со страницы банка, человек видит
тарифы, может открыть ту же ссылку снова или создать новую; `pageshow` из
bfcache отпускает занятую кнопку. Ответ 401 возвращает к вводу почты.

`SUPABASE_ANON_KEY` — публичный клиентский anon key, тот же, который уже
распространяется в приложении. Это не серверный секрет. Privileged keys нельзя
добавлять в исходники или статическую сборку. Клиент не подтверждает и не
активирует Premium: это делает существующий серверный webhook.

## Юридические документы

Тексты `/privacy`, `/offer` и `/consent` нельзя редактировать как обычный
маркетинговый контент. Любая правка выполняется как отдельное юридическое
изменение. Версия в платёжном payload (`LEGAL_DOCUMENT_VERSION`) — дата
действующей редакции оферты и согласия; она меняется только вместе с новой
утверждённой редакцией. Факты продукта (цены, редакции, реквизиты, ссылки на
сторы, числа программы) сверяет с монорепо `bun run test:facts` в Acrab-Expo.

## CI

`.github/workflows/check.yml` запускается в репозитории `acrab-landing` (в монорепо корневого `.github/` нет) для каждого pull request и push в
`main` в одном фиксированном порядке:

```text
bun install --frozen-lockfile
        ↓
bun run typecheck
        ↓
bun run test
        ↓
bun run build
        ↓
bun run verify:published
        ↓
bunx playwright install --with-deps chromium
        ↓
bun run test:browser
        ↓
python3 tools/check_site.py site
```

Затем workflow выполняет HTTP smoke для всех маршрутов, включая `/buy`, и
проверяет настоящий HTTP 404 для неизвестного адреса. `verify:published` падает,
если в коммите `site/` не совпадает со сборкой исходников. CI-артефакт — каталог
`site`.

## Timeweb

acrab.ru — приложение Timeweb Cloud 226073 (`static-nobuild`) с автодеплоем
из ветки `main`. Сборка на хостинге не выполняется: раздаётся только каталог
`site/` (настройка `index_dir = /site`) — сборка Astro: страницы, `_astro/`,
`assets/`, `robots.txt`, `sitemap.xml` и `404.html`. Исходники Astro, тесты,
инструменты и документы в корне репозитория наружу не отдаются. Правка
вносится в `src/` или `public/`, затем `bun run build` и коммит вместе с `site/`.
Сборка на Timeweb не нужна: у хостинга нет Bun, а статическая раздача готового
каталога не меняет настройки приложения.

Проверить настройку: `twc apps get 226073 -o json` (поля `framework`,
`index_dir`, `branch`, `is_auto_deploy`). SPA fallback запрещён:
отсутствующий URL должен возвращать реальный HTTP 404. После смены
deployment-настроек проверяются `/buy`, `/support`, `/robots.txt`,
`/sitemap.xml`, случайный отсутствующий URL и то, что `/README.md` отдаёт 404.

Платёжную страницу следует дополнительно защищать HTTP-заголовками хостинга:
`Content-Security-Policy` с `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff` и строгим
`Referrer-Policy`. Meta CSP не может задать `frame-ancestors`.

## Зарегистрированные URL и контакты

- External Purchase Link: `https://acrab.ru/buy`
- Support website: `https://acrab.ru/support`
- Marketing URL: `https://acrab.ru/`
- Privacy Policy URL: `https://acrab.ru/privacy`

`/buy` и `/support` нельзя переименовывать или заменять SPA-маршрутами: эти
адреса используются Apple. Кнопка поддержки ведёт на `@musa_1756`, публичный
канал в подвале — на `@musa1756_ai`; это разные адреса. Email поддержки
`lagutkin.maksim.03@mail.ru` сохраняется на `/support`.

Старая GitHub Pages-копия политики может оставаться доступной до проверки
production-страницы `/privacy`; удалять её до этого нельзя. Контакты внутри
юридического текста меняются только отдельной утверждённой правкой.

## Проверка после публикации

После публикации проверяются HTTP-ответы `/buy`,
`/support`, `/robots.txt`, `/sitemap.xml`, случайного отсутствующего URL и все
ссылки на магазины. Затем `https://acrab.ru/sitemap.xml` повторно отправляется
в Google Search Console и Яндекс Вебмастер.
