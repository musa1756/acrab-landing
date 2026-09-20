# Acrab Landing

Статический сайт Acrab на Astro 7. Все страницы генерируются во время сборки в
`dist/`; Node.js или Bun на production не требуются.

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
внешними сервисами; секреты backend не попадают в `dist`.

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

`bun run check` выполняет typecheck, unit-тесты, сборку и проверку итогового
каталога. Проверку можно запустить отдельно после сборки:

```bash
python3 tools/check_site.py dist
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
- `public/assets/`, `public/robots.txt` и `public/sitemap.xml` — файлы с неизменными публичными URL.
- `tests/` и `tools/check_site.py` — проверки исходников и готового `dist/`.

## Маршруты и SEO

Сохраняются маршруты `/`, `/about`, `/learn-arabic`, `/arabic-alphabet`,
`/fusha`, `/arabic-app`, `/buy`, `/support`, `/privacy`, `/offer`, `/consent`,
`/get` и `/404.html`. Сборка использует directory-style output, поэтому
`/buy` остаётся совместим с directory redirect на `/buy/`.

`/buy`, `/offer`, `/consent` и `/get` обязаны оставаться `noindex` и не входят
в sitemap. Canonical индексируемых страниц заканчиваются `/`, кроме корня.
Внутренние ссылки и пути к публичным ресурсам остаются абсолютными.

При добавлении индексируемого маршрута одновременно обновляются:

1. страница в `src/pages/` и её SEO-поля;
2. список URL в `public/sitemap.xml`;
3. списки маршрутов в `tools/check_site.py` и `tests/site.test.ts`.

## Changelog

Каждый релиз хранится отдельным JSON-файлом в `src/content/changelog/`. Схема
описана в `src/content.config.ts`. Обязательны версия, дата, заголовок,
описание и массивы `new`, `improvements`, `fixes`. Поле `image` допускает
`null`; отсутствие изображения не ломает сборку. Страница сортирует релизы по
дате от новых к старым.

Изображения релизов размещаются в `public/assets/changelog/`. Изменение
`assets/changelog/1-4.png`, существовавшее до миграции, не перезаписывается.

## Оплата

`/buy` остаётся статическим Astro shell с React island. Сценарий: тарифы и
публичные цены видны сразу, без входа; выбор тарифа, затем email OTP
существующего аккаунта и проверка кода только ради оплаты, чтение своей
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
Опубликованная копия `buy/index.html` повторяет ту же логику на чистом JS и
меняется вместе с `src/`.

`SUPABASE_ANON_KEY` — публичный клиентский anon key, тот же, который уже
распространяется в приложении. Это не серверный секрет. Privileged keys нельзя
добавлять в исходники или статическую сборку. Клиент не подтверждает и не
активирует Premium: это делает существующий серверный webhook.

## Юридические документы

Тексты `/privacy`, `/offer` и `/consent` нельзя редактировать как обычный
маркетинговый контент. Любая правка выполняется как отдельное юридическое
изменение. Версии документов в платёжном payload меняются только вместе с
утверждённой редакцией и серверной обработкой.

## CI

`.github/workflows/check.yml` запускается для каждого pull request и push в
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
python3 tools/check_site.py dist
```

Затем workflow выполняет HTTP smoke для всех маршрутов, включая `/buy`, и
проверяет настоящий HTTP 404 для неизвестного адреса. Единственный CI-артефакт
— готовый каталог `dist`.

## Timeweb

Настройки статического приложения:

```text
Build command:
bun install --frozen-lockfile && bun run build

Output directory:
dist
```

Среда сборки должна использовать Node.js 22.12 или новее и Bun из
`.bun-version`. SPA fallback запрещён: отсутствующий URL должен возвращать
реальный HTTP 404. После смены deployment-настроек проверяются `/buy`,
`/support`, `/robots.txt`, `/sitemap.xml` и случайный отсутствующий URL.

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

После preview и production deployment проверяются HTTP-ответы `/buy`,
`/support`, `/robots.txt`, `/sitemap.xml`, случайного отсутствующего URL и все
ссылки на магазины. Затем `https://acrab.ru/sitemap.xml` повторно отправляется
в Google Search Console и Яндекс Вебмастер.
