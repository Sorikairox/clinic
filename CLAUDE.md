# CLAUDE.md

Guidance for working in this repository. Read this before making changes.

## What this is

A multilingual (7-locale), server-rendered marketing site **and** online booking
system for **Shiba Gastroenterology & Proctology Clinic** (しば胃腸こうもんクリニック),
a real proctology/gastroenterology clinic in Minato-ku, Tokyo. It is a rebuild of
the original `shibaangel.com` with first-class translations (not a translate
widget) and a proper booking flow + staff dashboard.

## Stack

- **Astro 7** in `output: 'server'` (SSR). Adapter is Netlify by default;
  `ASTRO_ADAPTER=node` switches to a standalone Node server (used for tests/VPS).
- **Drizzle ORM + libSQL** (`@libsql/client`). Local dev defaults to a SQLite
  file (`file:./local.db`); production points `DATABASE_URL` at Turso. The same
  client also speaks HTTP, so a local `libsql-server` works too (see Test DB).
- **Resend** for transactional email; falls back to console logging when
  `RESEND_API_KEY` is unset.
- Auth is hand-rolled: scrypt hashing + signed httpOnly session cookie. No auth
  library.
- Tests: **Vitest** (unit) + **Playwright** (e2e).

## Commands

```bash
npm run dev            # dev server at http://localhost:4321
npm test               # Vitest unit tests (fast; run after logic/i18n changes)
npm run test:e2e       # Playwright e2e (builds with the node adapter)
ASTRO_ADAPTER=node npm run build   # production build used by tests/CI

npm run db:generate    # generate SQL migration from src/db/schema.ts
npm run db:migrate     # apply migrations (creates local.db by default)
npm run db:seed        # seed the first staff account (uses SEED_* env vars)
```

Always run `npm test` before considering a change done — the suite is fast and
covers the two most fragile areas (slot availability + i18n key parity).

## Project layout

- `src/pages/[...locale]/` — public pages. The `[...locale]` param is the locale
  prefix; **Japanese is the default and lives at `/`** (no prefix), every other
  locale is under `/<locale>/`. Each page resolves the locale via
  `resolveLocale(Astro.params.locale)` and returns 404 for unknown locales.
- `src/pages/admin/` — staff login + dashboard (cookie session).
- `src/pages/reservation/` — the public booking flow.
- `src/components/` — `Header`, `Footer`, `LangSwitcher`, `SeoHead`, `HoursTable`.
- `src/layouts/Base.astro` — the page shell (head, header, footer).
- `src/i18n/` — locale config + one JSON dictionary per locale. **The heart of
  the content.**
- `src/lib/` — pure logic: `schedule.ts` (opening hours), `hours.ts` (display
  grid), `availability.ts` (slot computation), `seo.ts` (JSON-LD), `email.ts`,
  `session.ts`, `password.ts`, `routes.ts` (nav manifest).
- `src/db/` — Drizzle schema, client, queries, migrate + seed scripts.
- `public/images/` — clinic photos (logo, director, services, facility gallery).

## Internationalization — the important conventions

- Locales are declared **once** in `src/i18n/config.ts` (`LOCALES`,
  `LOCALE_NAMES`, `LOCALE_TAGS`). Routing, the language switcher, hreflang and the
  sitemap all derive from that list. To add a locale: add it there, add
  `src/i18n/<locale>.json`, and add it to `astro.config.mjs`'s `i18n.locales`.
- **Every locale JSON must have an identical key structure.** `src/i18n/i18n.test.ts`
  enforces this against `en.json` (it also catches a string↔array mismatch). If
  you add/remove a key, update **all 7** files or the test fails.
- `en.json` (English) and `ja.json` (Japanese) are the **authored source of
  truth**. The other five (`zh-Hans`, `zh-Hant`, `pt-BR`, `ru`, `es`) are
  translations and should be reviewed by a bilingual/medical reviewer before
  launch — flag this rather than silently editing medical terms.
- Reading dictionaries in pages:
  - `useTranslations(locale)` → `t('a.b.c')` for strings (`{placeholder}` interpolation supported).
  - `useList(locale)` → `list('a.b')` for `string[]` values.
  - `useItems(locale)` → `items('a.b')` for arrays of objects (e.g. price rows `{ label, price }`).
  All three fall back to the default locale, then to a safe empty/raw value.
- Keep numbers, prices (¥ amounts), phone/fax, station codes, and equipment model
  names **untranslated** across locales — only prose changes per language.

## Opening hours live in TWO places — keep them in sync

1. `src/lib/schedule.ts` — the **bookable** schedule (`WEEKLY_TEMPLATE`): which
   weekday/time ranges generate reservable slots. Drives `availability.ts`.
2. `src/lib/hours.ts` — the **display** grid (`HOURS_GRID`) shown by
   `HoursTable.astro` on the home and access pages, plus the `hours.*` strings in
   each locale JSON.

Current real hours: Mon/Thu/Fri full day (10:00–12:30 & 15:00–18:00), Tue & Sat
morning only, Wed appointment-only (not online-bookable), Sun/holidays/2nd & 4th
Sat closed. If hours change, update both files and the `hours` block in every
locale JSON, then update `availability.test.ts` expectations and
`src/lib/seo.ts` (`openingHoursSpecification`).

## Clinic facts (for content accuracy)

- Name: しば胃腸こうもんクリニック / Shiba Gastroenterology & Proctology Clinic.
- Director: 佐藤 幸宏 (Dr. Yukihiro Satoh); clinic founded 2013.
- Address: 〒108-0014 東京都港区芝4-11-5 KTビル3階.
- Phone 03-6453-9307, Fax 03-6453-9367. Mita Stn ~3 min, Tamachi Stn ~6 min.

These appear in the locale JSONs and in `src/lib/seo.ts` (JSON-LD). Update both if
a fact changes.

## Booking flow (how it fits together)

`reservation/index.astro` is a two-step picker: choose a **date**, then a **time
slot**. The date step renders a [flatpickr](https://flatpickr.js.org/) popup
calendar restricted (`enable`) to only the dates that have free slots — this is a
**progressive enhancement** layered over a server-rendered month grid
(`src/lib/calendar.ts` + `HoursTable`-style markup). With JS off, the inline grid
(`.cal-fallback`) is used instead; with JS on, the script hides the grid and shows
the flatpickr input. Both paths just navigate to `?date=YYYY-MM-DD`, which makes
the server render that day's slots; clicking a slot navigates to `?slot=` and
shows the patient form. Availability comes from `availability.ts` (free = template
slots minus already-booked rows). The available dates are passed to the client via
the `#calendar-widget` `data-enable` attribute (e2e tests read it too). Submitting
calls the
`createBooking` action (`src/actions/index.ts`), which inserts the booking under
an atomic guard so two patients can't grab the same slot, then best-effort sends
a "received" auto-reply email **in the patient's chosen locale**. Staff confirm or
decline from `admin/`, which sends the matching confirmed/declined email. All
three emails are defined in `src/lib/email.ts` and localized via the booking's
`locale`.

## Test database (Docker)

The app uses libSQL, so the local "test DB" is a `libsql-server` container, not
Postgres. See `Dockerfile.testdb` + `docker-compose.yml`:

```bash
docker compose up -d testdb        # libSQL server on http://127.0.0.1:8080
DATABASE_URL=http://127.0.0.1:8080 npm run db:migrate
DATABASE_URL=http://127.0.0.1:8080 npm run db:seed
DATABASE_URL=http://127.0.0.1:8080 npm run dev
```

For most local work you don't even need this — the default `file:./local.db`
SQLite file is simpler. Use the container when you want to exercise the real
HTTP/libSQL client path that production uses.

## Gotchas

- Don't hardcode locale prefixes in links — use `localizedPath(path, locale)`.
- Adding a public page? Add it to `PUBLIC_PATHS` (and `NAV_ITEMS` if it should be
  in the nav) in `src/lib/routes.ts` so the sitemap and nav stay in sync.
- Images are static files under `public/images/` referenced by absolute path
  (`/images/...`); they are not processed by Astro's asset pipeline.
- The build artifacts (`dist/`, `.netlify/`) and `local.db` are local-only.
