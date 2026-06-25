# Shiba Coloproctological Clinic — website & booking system

A multilingual, server-rendered website for a Tokyo proctology/gastroenterology
clinic, with an online booking system and a staff dashboard. Built as a
low-cost, SEO-first rebuild of the original Google-Translate-widget site.

## Highlights

- **7 real locales**, server-rendered (not a translate widget): Japanese (root),
  English, Simplified Chinese, Traditional Chinese, Brazilian Portuguese,
  Russian, Spanish — each with its own URL, `hreflang` alternates and sitemap
  entry for proper SEO.
- **SSR** via Astro for full-HTML, crawlable pages + `MedicalClinic` JSON-LD.
- **Booking flow**: patients pick a time slot, fill in their details, and submit
  a request. An atomic DB guard prevents double-booking.
- **Staff dashboard**: cookie-session login; confirm or decline pending
  bookings. Each decision emails the patient **in their chosen language**.
- **Low cost**: runs on free tiers — SQLite/Turso for data, Resend for email.

## Stack

| Concern | Choice |
|---|---|
| Framework | [Astro](https://astro.build) (SSR, `@astrojs/node` adapter) |
| Database | SQLite via [libSQL](https://github.com/tursodatabase/libsql) + [Drizzle ORM](https://orm.drizzle.team) (local file in dev, [Turso](https://turso.tech) in prod) |
| Email | [Resend](https://resend.com) HTTP API |
| Auth | scrypt password hashing + signed httpOnly session cookie (no external dep) |
| Tests | Vitest (unit) + Playwright (e2e) |

## Getting started

```bash
npm install
cp .env.example .env          # then edit values (at minimum SESSION_SECRET)

npm run db:generate           # generate SQL migrations from the Drizzle schema
npm run db:migrate            # apply migrations (creates local.db by default)
SEED_STAFF_EMAIL=you@clinic SEED_STAFF_PASSWORD=secret npm run db:seed

npm run dev                   # http://localhost:4321
```

Visit `/` (Japanese), `/en`, `/es`, … for the site, and `/admin` for the staff
dashboard (log in with the seeded credentials).

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / run the built server |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed the first staff account |
| `npm test` | Vitest unit tests (availability logic) |
| `npm run test:e2e` | Playwright e2e (booking, double-booking, admin) |

## Configuration

- **Opening hours / slots** live in `src/lib/schedule.ts` (weekly template, slot
  length, blocked holiday dates, booking window). Free slots are computed, not
  stored.
- **Locales** are defined once in `src/i18n/config.ts`; routing, the language
  switcher, hreflang and the sitemap all derive from that list.

## Internationalization

UI strings and page copy live in `src/i18n/<locale>.json` — one dictionary per
locale, all sharing an identical key structure. Japanese and English are the
authored source; the other five were **AI-drafted and should be reviewed by a
bilingual/medical reviewer before launch** (especially medical terminology).

To add a locale: add it to `LOCALES`/`LOCALE_NAMES`/`LOCALE_TAGS` in
`src/i18n/config.ts`, add a matching `src/i18n/<locale>.json`, and register it in
`astro.config.mjs`'s `i18n.locales`.

## Email

Three transactional emails are sent through Resend (`src/lib/email.ts`), all
localized by the booking's `locale`:

- **Auto-reply on submission** — an acknowledgement that the request was received
  (sent from the `createBooking` action, best-effort).
- **Confirmation** / **decline** — sent when staff act on a booking from the
  dashboard.

Without `RESEND_API_KEY` the app logs the email instead of sending it, so the
flow works end to end in development.

## Deployment (low cost)

### Database — Turso (free tier)
```bash
turso db create shiba-clinic
turso db show shiba-clinic --url           # -> DATABASE_URL
turso db tokens create shiba-clinic        # -> DATABASE_AUTH_TOKEN
```
Run `npm run db:migrate` and `npm run db:seed` against those env vars once.

### Hosting — Netlify (default)
The build targets **Netlify** by default (`@astrojs/netlify`). Connect the repo to
a Netlify site; `netlify.toml` sets the build command and Node version, and the
adapter wires up the serverless functions automatically. Set the production env
vars (see `.env.example`) in the Netlify dashboard:
`SITE_URL`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`.

### Hosting — Node (VPS / Fly / Render / tests)
Set `ASTRO_ADAPTER=node` to build a standalone Node server instead:
```bash
ASTRO_ADAPTER=node npm run build && npm start   # node ./dist/server/entry.mjs
```
This is also what the Playwright e2e suite uses.

## CI / CD

Two GitHub Actions workflows:

- **`.github/workflows/ci.yml`** — runs unit + e2e tests on every pull request
  (and on pushes to `main`).
- **`.github/workflows/deploy.yml`** — on push to `main`, applies DB migrations
  (if configured) and deploys to Netlify.

The deploy workflow needs these repo **secrets**: `NETLIFY_AUTH_TOKEN`,
`NETLIFY_SITE_ID`, and (optionally, to auto-migrate) `DATABASE_URL` +
`DATABASE_AUTH_TOKEN`; plus an optional `SITE_URL` repo **variable**.

## Testing

- `npm test` — pure-logic unit tests for slot/availability computation.
- `npm run test:e2e` — Playwright drives a real build: a patient books a slot, a
  concurrent double-booking is rejected, and a staff member logs in and confirms
  a booking. (In this environment the preinstalled Chromium is used via
  `PW_CHROMIUM_PATH` / the path set in `playwright.config.ts`.)
