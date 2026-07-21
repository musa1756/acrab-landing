# Acrab Landing

Static one-page landing for App Store Connect URLs.

## Files

- `index.html` - one-page website.
- `buy/index.html` - StoreKit External Purchase Link target page: email-OTP sign-in against the existing Supabase auth (`/auth/v1/otp` + `/verify`), then calls `tochka-payment` (`action=create`) with the resulting JWT and redirects to the returned Tochka `paymentLink`. No query params by design — the URL registered with Apple must stay static. Premium activation happens server-side via `tochka-payment-webhook`; this page never calls `confirm`.
- `support/index.html` - dedicated support page (Apple's External Purchase entitlement requires a real support destination, not just a mailto link): payment FAQ, refunds, disputing unauthorized charges.
- `privacy/index.html` - personal data policy (152-ФЗ). Ported verbatim from the
  old `musa1756/Acrab-privacy` GitHub Pages repo; it is fully self-contained
  (own inline styles, no shared assets) and deliberately does **not** use
  `styles.css`. Treat the body text as legal copy — do not reword it casually.
- `styles.css` - responsive styling, shared by the landing, buy and support pages.
- `assets/acrab-app-icon.png` - copied from the app asset catalog and used for icons, previews, and social sharing.

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

- all four Apple-registered routes (`/`, `/buy`, `/support`, `/privacy`) resolve
  to a real file;
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

Current support email: `musa1756@proton.me`.

If you want Gmail instead, replace all `musa1756@proton.me` values in
`index.html` and `support/index.html`.
