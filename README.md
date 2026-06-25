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

Confirmation/decline emails are sent through Resend from the dashboard actions
(`src/actions/index.ts` → `src/lib/email.ts`). Without `RESEND_API_KEY` the app
logs the email instead of sending it, so the flow works in development. Templates
are localized by the booking's `locale`.

## Deployment (low cost)

### Database — Turso (free tier)
```bash
turso db create shiba-clinic
turso db show shiba-clinic --url           # -> DATABASE_URL
turso db tokens create shiba-clinic        # -> DATABASE_AUTH_TOKEN
```
Run `npm run db:migrate` and `npm run db:seed` against those env vars once.

### Hosting
This project uses the **Node adapter**, so the built server (`npm start`) runs on
any Node host — a small VPS, Fly.io, Render, Railway, or **Netlify** (swap to
`@astrojs/netlify` in `astro.config.mjs`).

Required production env vars (see `.env.example`):
`SITE_URL`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`.

## Testing

- `npm test` — pure-logic unit tests for slot/availability computation.
- `npm run test:e2e` — Playwright drives a real build: a patient books a slot, a
  concurrent double-booking is rejected, and a staff member logs in and confirms
  a booking. (In this environment the preinstalled Chromium is used via
  `PW_CHROMIUM_PATH` / the path set in `playwright.config.ts`.)
