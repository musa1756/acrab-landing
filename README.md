# Acrab Landing

Static site for App Store Connect URLs and the external payment flow. The home
page is a **changelog**, not a marketing one-pager: four header tabs
(Главная / О приложении / Оплата / Q/A), each a real page. The footer is
deliberately bare — one link to the privacy policy, nothing else.

## Files

- `index.html` - the changelog, laid out after `raycast.com/changelog`: one
  `<article class="release">` per version, newest first, each with a sticky left
  rail (version chip + date) beside a wide content column — emoji headline,
  screenshot, description, then `✨ Новое` / `💎 Улучшения` / `🐞 Исправления`
  sections as em-dash lists. A copy-paste template sits in an HTML comment at
  the top of `.changelog`. Release images live in `assets/changelog/` — until a
  file exists there, keep the `.media-placeholder` block instead of an `<img>`,
  because `tools/check_site.py` fails on a `src` that does not resolve.
- `about/index.html` - «О приложении». Intentionally an empty state for now;
  Musa fills the copy in later.
- `buy/index.html` - StoreKit External Purchase Link target page: email-OTP sign-in against the existing Supabase auth (`/auth/v1/otp` + `/verify`), then calls `tochka-payment` (`action=create`) with the resulting JWT and redirects to the returned Tochka `paymentLink`. No query params by design — the URL registered with Apple must stay static. Premium activation happens server-side via `tochka-payment-webhook`; this page never calls `confirm`.
- `support/index.html` - «Q/A», the fourth header tab. Still the Apple-registered
  support destination (their External Purchase entitlement requires a real one,
  not just a mailto link), so the URL stays `/support` and the contact button +
  address stay above the fold — only the visible label is Q/A. Content: payment
  FAQ, refunds, disputing unauthorized charges.
- `privacy/index.html` - personal data policy (152-ФЗ). Ported verbatim from the
  old `musa1756/Acrab-privacy` GitHub Pages repo; it is fully self-contained
  (own inline styles, no shared assets) and deliberately does **not** use
  `styles.css`. Treat the body text as legal copy — do not reword it casually.
- `styles.css` - responsive styling, shared by the changelog, about, buy and
  support pages. Flat white page with gold everywhere Raycast uses red: gold
  version chips, gold inline `code`, gold links, gold active-nav underline. The
  gold is the app's `acrabGold` from `Theme/AppTheme.swift`, darkened to
  `--gold-text` where it has to carry text on white. Light-only, like the app,
  and deliberately not the rounded/blurred iOS look the first draft had.
- `assets/acrab-app-icon.png` - copied from the app asset catalog and used for icons, previews, and social sharing.
- `assets/changelog/` - screenshots shown in release cards; see the README there.

`buy/index.html` already has the production anon key (pulled from the Beget `.env`, same value as the iOS app ships) inlined — it's the public anon key, safe client-side, not a `service_role` secret.

### Why the directory layout

Apple's registered URLs are `https://acrab.ru/buy` and `https://acrab.ru/support`
— extensionless. Serving those as `buy/index.html` and `support/index.html` gets
that for free from directory-index behaviour on any static host, with no
host-specific rewrite rules to write or maintain. The trade-off: every internal
link and asset reference must be **absolute** (`/styles.css`, `/assets/…`), or it
breaks one level deep. Keep it that way when editing.

Note that `/buy` serves via a 301 to `/buy/` — normal directory-index behaviour,
transparent to browsers. Serving `/buy` with no redirect at all would require a
per-host rewrite (`try_files $uri $uri.html $uri/`), which is exactly the
maintenance this layout avoids.

Verify locally before deploying:

```bash
python3 tools/check_site.py     # the same gate CI runs
python3 -m http.server 8899     # or eyeball it
```

## CI gate

Timeweb Cloud auto-deploys `main` with no build step, so nothing else stands
between a bad push and production. `.github/workflows/check.yml` runs
`tools/check_site.py` on every push and pull request, which enforces:

- all five routes (`/`, `/about`, `/buy`, `/support`, `/privacy`) resolve to a
  real file — the four Apple-registered ones plus `/about`, which is a header
  button and 404s just as visibly;
- internal links are absolute and point at something that exists — the relative
  path regression this layout is prone to;
- no links back to the retired `musa1756.github.io/Acrab-privacy` address;
- no `.DS_Store` committed.

It then serves the site and asserts every route returns 200.

The checks are verified to fail, not just to pass — breaking a link or deleting
`privacy/` makes the gate exit non-zero.

## App Store Connect

Production URLs:

- Support URL: `https://acrab.ru/`
- Marketing URL: `https://acrab.ru/`
- Privacy Policy URL: `https://acrab.ru/privacy`

`/` now serves the changelog. If a reviewer expects a product pitch at the
Marketing URL, either point it at `/about` once that page has copy, or move the
pitch onto `/`. The Support URL is better served by `/support` in any case.

External Purchase Link entitlement (payment processing website request):

- Целевой URL-адрес / Target URL: `https://acrab.ru/buy` — must exactly match whatever gets configured in `Info.plist`/entitlements once Apple approves the request.
- Веб-сайт службы поддержки / Support website: `https://acrab.ru/support`

### Privacy policy hosting

The policy used to live at `https://musa1756.github.io/Acrab-privacy/` while its
own section 14 named `acrab.ru/privacy` as the canonical address — the document
contradicted where it was published. It is now served from this repo at
`/privacy`, and all in-page links point there.

The old `musa1756/Acrab-privacy` repo is now redundant. Leave it published until
`acrab.ru/privacy` is confirmed live, then archive it — do not delete, since the
GitHub Pages URL may already be referenced in submitted App Store metadata.

## Hosting

Timeweb Cloud project `2603091` currently holds **only the domain** — no server,
no app, nothing serving the site yet. Recommended target is Timeweb Cloud
**Приложения → статический сайт** built from the GitHub repo
(`musa1756/Acrab-Swift`) with root directory `landing/`, which makes deploy a
plain `git push` and provisions TLS automatically.

This is separate from the API: `api.acrab.ru` points directly at the self-hosted
Supabase production host on Beget. Pointing `acrab.ru` at a new host only touches
the `A` record — `MX`/mail records are unaffected.

## Analytics Note

The landing page is static and does not include PostHog tracking. Product analytics live inside the iOS app; see `../docs/analytics/posthog-events.md`.

## Contact

Two Telegram handles, and they are **not** interchangeable:

- `@musa_1756` — personal account, target of the «Написать в поддержку» button
  on `/support`.
- `@musa1756_ai` — the public channel, linked from the «Мы в соцсетях» block in
  every page footer.

Email `lagutkin.maksim.03@mail.ru` stays on `/support` next to the Telegram
handle: it is the written contact Apple's support-website requirement expects,
and it is what the refund/chargeback FAQ answers point at. Do not drop it in
favour of Telegram alone.

`privacy/index.html` still names the older `musa1756@proton.me` as the
personal-data contact, in three places. That is legal copy under 152-ФЗ, so it
was left alone deliberately — change it only together with Musa, and change all
three at once.

The footer's Telegram glyph is an inline SVG on purpose — the pages ship
`img-src 'self'`, so a remote icon from a CDN would be blocked.
