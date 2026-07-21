# Acrab Landing

Static one-page landing for App Store Connect URLs.

## Files

- `index.html` - one-page website.
- `buy/index.html` - StoreKit External Purchase Link target page: email-OTP sign-in against the existing Supabase auth (`/auth/v1/otp` + `/verify`), then calls `tochka-payment` (`action=create`) with the resulting JWT and redirects to the returned Tochka `paymentLink`. No query params by design — the URL registered with Apple must stay static. Premium activation happens server-side via `tochka-payment-webhook`; this page never calls `confirm`.
- `support/index.html` - dedicated support page (Apple's External Purchase entitlement requires a real support destination, not just a mailto link): payment FAQ, refunds, disputing unauthorized charges.
- `styles.css` - responsive styling, shared by all three pages.
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
cd landing && python3 -m http.server 8899
# then check /, /buy, /support, /styles.css all return 200
```

## App Store Connect

Production URLs:

- Support URL: `https://acrab.ru/`
- Marketing URL: `https://acrab.ru/`
- Privacy Policy URL: **unresolved** — see below.

External Purchase Link entitlement (payment processing website request):

- Целевой URL-адрес / Target URL: `https://acrab.ru/buy` — must exactly match whatever gets configured in `Info.plist`/entitlements once Apple approves the request.
- Веб-сайт службы поддержки / Support website: `https://acrab.ru/support`

### Open item: privacy policy URL

This README previously claimed `https://acrab.ru/privacy`, but no `privacy.html`
exists in this directory and every in-page link points at
`https://musa1756.github.io/Acrab-privacy/` (GitHub Pages). Those cannot both be
right. Pick one before submitting to Apple:

- keep GitHub Pages and register that URL in App Store Connect, or
- add `privacy/index.html` here so `https://acrab.ru/privacy` becomes real, and
  repoint the in-page links.

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
