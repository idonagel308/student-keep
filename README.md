# Student Keep

A small app for keeping track of a semester's coursework: which lectures
you've watched, what homework is due and when, how far along each course is,
and how your degree is progressing overall. Built with Next.js, Postgres (via
Prisma), and Cloudflare R2 for file storage. Optionally syncs lectures, final
exams and homework to your own Google Calendar and Google Tasks.

Data is organized as semesters → courses → lectures and homework. Each course
tracks a lecture count so you can see watched/total progress at a glance, and
homework items can have a due date, an assignment file, and your own answer
(either typed text or an uploaded file). Everything is scoped to a signed-in
user — there's no sharing between accounts.

Accounts are invite-gated: signup requires a shared invite code, so this
isn't meant to be a public sign-up app. It's built for a small group of
people you hand the code to yourself.

## Features

- **This week** (the home page) — homework due across every semester
  (including overdue), lectures scheduled this week for whichever semester is
  currently active (grouped by day, with their times), and a 7-day calendar
  showing both at a glance. Calendar entries lead with the course name and
  carry the course's color; on phones the calendar becomes one card per day.
- **Degree overview** — credits-weighted average across every graded course,
  a per-semester breakdown, and a list of graded courses searchable by name
  or course number. A course can be graded either with a numeric score or as
  a plain "Pass" (for pass/fail courses) — a Pass counts its credits toward
  the degree total without affecting the weighted average.
- **Semesters and courses** — an optional course number (e.g. a catalog code
  like "10225") shown next to the course name, a pace indicator
  (ahead/behind/on-pace vs. lectures actually scheduled to date), and
  semesters grouped by status (in progress / planned / completed), and an
  optional final exam date per course (set from the course page).
- **Lectures** — auto-scheduled weekly from the semester's start date, or
  from a specific day of the week if you set one per course (e.g. "this
  course meets Wednesdays"), every week or every two weeks, with per-lecture
  manual override and optional PDF summary uploads. A course can have a usual
  lecture time (e.g. 10:00–12:00) shared by all its lectures, and any single
  lecture can override it. Google Calendar events are timed when a time is set
  (Asia/Jerusalem by default; set `GOOGLE_EVENT_TIMEZONE` to change it, 1 hour
  long if no end time is given).
- **Homework** — due dates, an assignment PDF, your own answer as typed
  text or an uploaded PDF, and a done/not-done toggle.
- **Google sync (optional)** — see [Google Calendar and Tasks](#google-calendar-and-tasks-optional).
- **First-run walkthrough** — new accounts get a short onboarding tour.
- **Settings** — light/dark appearance, English/Hebrew language (Hebrew
  switches the whole app to right-to-left), degree name and required
  credits, Google connection and sync toggles, and account deletion
  (removes everything you own, including uploaded files and synced Google
  items; no undo).
- **Privacy note** — a public, bilingual page at `/privacy`, linked from
  signup and every footer.

## Stack

- Next.js (App Router, server actions)
- PostgreSQL, accessed through Prisma
- Cloudflare R2 (S3-compatible) for uploaded PDFs — assignment files, answer
  files, lecture summaries. Falls back to Vercel Blob automatically if R2
  isn't configured (see [Environment variables](#environment-variables)
  below); a fresh setup should just use R2.
- Cookie-based sessions signed with a server-side secret, no external auth
  provider
- Google Calendar and Tasks REST APIs, called with plain `fetch` (no Google
  client library)
- Vitest for the test suite

## Running it locally

You'll need Node.js, a Postgres database (a free [Neon](https://neon.tech)
database works fine, which is also what production uses), and a Cloudflare
R2 bucket for file uploads.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   See [Environment variables](#environment-variables) below for what each
   one is and where to get it.

3. Push the schema to your database:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), go to `/signup`, and
   create an account using your invite code.

## Environment variables

All of these go in `.env` locally, and in your host's environment variable
settings for production (they are never read from `.env` in production).

| Variable | Required | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Your Postgres connection string (pooled, if your provider distinguishes). On Neon: project → Connect → copy the connection string. |
| `DIRECT_URL` | Yes | Same as above, but the **unpooled** connection — used for running migrations. If your provider only gives you one string, use it for both. |
| `R2_ACCOUNT_ID` | Recommended | Cloudflare dashboard → R2 → shown on the R2 overview page. |
| `R2_ACCESS_KEY_ID` | Recommended | Cloudflare dashboard → R2 → Manage API Tokens → Create API Token, scoped to **Object Read & Write** on your bucket. Shown once when created. |
| `R2_SECRET_ACCESS_KEY` | Recommended | Same token creation step as above — shown once, save it immediately. |
| `R2_BUCKET_NAME` | Recommended | The name you gave the bucket when you created it (Cloudflare dashboard → R2 → Create bucket). |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel project → Storage → Blob. Only needed if you want the legacy Vercel Blob fallback available; leave unset for a fresh setup — see [File storage](#file-storage) below. |
| `SESSION_SECRET` | Yes | A random secret used to sign session cookies. Generate one with:<br>`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SIGNUP_INVITE_CODE` | Yes | Whatever code you want to require for signup. Pick something and share it with whoever you want to be able to create an account. |
| `GOOGLE_CLIENT_ID` | For Google sync | Google Cloud Console → APIs & Services → Credentials → your OAuth client ID (Web application). |
| `GOOGLE_CLIENT_SECRET` | For Google sync | Same OAuth client — shown when you create it. |
| `GOOGLE_REDIRECT_URI` | For Google sync | Must exactly match an authorized redirect URI on that OAuth client: `http://localhost:3000/api/google/callback` locally, `https://<your-domain>/api/google/callback` in production. |
| `GOOGLE_EVENT_TIMEZONE` | Optional | IANA time zone for timed lecture events. Defaults to `Asia/Jerusalem`. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Required for Google sync | A random 32-byte key that encrypts users' Google tokens in the database. Generate with the same command as `SESSION_SECRET`. Connecting Google is refused without it, and changing it later means each user must reconnect. |

## File storage

File uploads (`src/lib/blob.ts`) auto-select their backend at runtime, with
no code change needed to switch:

- If all four `R2_*` variables are set, uploads go to **Cloudflare R2**.
- Otherwise, they fall back to **Vercel Blob** (needs `BLOB_READ_WRITE_TOKEN`).

For a brand-new setup, just configure R2 and ignore Vercel Blob entirely —
the fallback exists for continuity with deployments that started on Blob
before R2 support was added, not because you need both.

Regardless of backend, uploaded PDFs are stored as **private** objects and
served through `/api/files/[...path]`, which checks server-side that the
requesting user actually owns the lecture/homework row referencing that file
before streaming it back — an unguessable URL is not treated as
authorization on its own.

## Google Calendar and Tasks (optional)

Each user can connect their own Google account from Settings. Three
independent toggles control what syncs:

- **Lectures → Google Calendar events.** All-day events, or timed events when
  the course or lecture has a time.
- **Final exam dates → Google Calendar events.**
- **Homework with a due date → Google Tasks** (completion syncs too).

Sync is **one-way**: the app writes to Google and never reads your calendar
or tasks. Switching a toggle on backfills everything that already exists.
After that, creating, editing or deleting an item updates Google, and
deleting a course, semester or account removes the matching events/tasks.
If Google no longer has an item (deleted by hand, say), the next edit
recreates it. Disconnecting revokes the app's access at Google.

Setting it up (one time, in [Google Cloud Console](https://console.cloud.google.com)):

1. Enable the **Google Calendar API** and **Google Tasks API**.
2. Configure the OAuth consent screen (External). The scopes are
   `calendar.events` and `tasks`.
3. Create an OAuth client ID (Web application) with the redirect URIs from
   the table above, and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
   `GOOGLE_REDIRECT_URI`.
4. Generate `GOOGLE_TOKEN_ENCRYPTION_KEY`. Connecting is refused without it.

Things worth knowing:

- While the consent screen is in **Testing** mode, every person who connects
  must be added under **Test users**, or their connection silently stops
  working after about 7 days.
- Sync failures never block saving, and they are not shown in the UI. They
  are logged server-side with a `[google]` prefix, so search your host's logs
  for that when something doesn't show up in Google.
- Tokens are encrypted at rest (AES-256-GCM). If you change or lose
  `GOOGLE_TOKEN_ENCRYPTION_KEY`, users have to disconnect and reconnect.

`GOOGLE_CALENDAR_SYNC.md` is the original design plan. The code has moved on
(timed events, exam dates, self-healing updates), so treat this section as
the source of truth.

## Privacy

The public privacy note lives at `/privacy` (content in
`src/lib/privacyContent.ts`, English and Hebrew) and is linked from the
sign-up form and every page footer. If a feature starts storing or sending
new kinds of data, update that file and its date in the same change.
Deleting a course, semester or account also deletes the uploaded PDFs and
the Google Calendar events/Tasks the app created (`src/lib/cleanup.ts`).

## Running tests

```bash
npm test          # Vitest suite
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
```

Runs the Vitest suite: input validation, path-safety checks, and pure
scheduling/calendar logic always run. A live round-trip test against your
actual R2 bucket (upload → read back → delete) additionally runs whenever
the four `R2_*` variables are present in your environment — otherwise it's
skipped, not failed.

## Deploying

The app is set up to deploy on Vercel with a Neon Postgres database and a
Cloudflare R2 bucket attached, but any host that can run a Next.js app and
reach a Postgres database will work. A few things that aren't obvious if
you're setting this up fresh:

- Set all the environment variables from the table above in your host's
  environment settings — they don't get picked up from `.env` automatically
  in production. If you use Google sync, add your production redirect URI
  to the OAuth client too.
- The build script (`scripts/migrate-if-production.js`) runs pending
  migrations automatically during a production build, but skips preview
  builds so a preview deploy can't run migrations against your real database.
- If you're on Vercel, make sure the project's Framework Preset is actually
  set to Next.js in Settings → Build and Deployment — it can default to
  "Other" depending on how the project was created, which will make every
  route 404.
- If you're migrating an *existing* deployment from Vercel Blob to R2 (not a
  fresh setup), there's a one-time copy script:
  `node scripts/migrate-blob-to-r2.js --dry-run`, then without the flag once
  it looks right. It only copies — it never deletes the source Blob store,
  so do that manually afterward once you've confirmed the app reads
  correctly with the `R2_*` variables set.

## How it was built

I built Student Keep by directing Claude Code, Anthropic's AI coding agent. Claude Code wrote the code; I did not type it by hand. My part was deciding what to build and in what order, choosing the stack and services (Next.js, Neon Postgres, Cloudflare R2 and Vercel), testing every feature in the real app, reporting bugs, asking for a security review, and deciding what got merged. I use the app every day for my own semester, which is how most of the bugs were found. Building it taught me how to get reliable work out of an AI agent, and where it goes wrong, which is why I test each change in the real app before it ships.

## Notes on how it's built

- Every page and server action checks the signed-in user server-side before
  touching the database — there's no page that trusts a client-supplied user
  ID.
- Uploaded files are stored as private objects and served through an
  ownership-checked route rather than relying on an unguessable URL (see
  [File storage](#file-storage) above).
- Login and signup are rate-limited using a database table (not
  in-memory), since serverless functions don't share memory between
  invocations. Login is limited per IP + email, with a looser per-account
  cap, so a stranger can't lock the real owner out. Expired rows are purged
  because their keys contain IPs and emails.
- Responses carry a strict Content-Security-Policy, HSTS, and the usual
  clickjacking/sniffing headers (`next.config.ts`).
- Anything that lives outside the database (uploaded PDFs, Google events and
  tasks) is cleaned up explicitly when its parent is deleted — a cascading row
  delete alone would orphan it (`src/lib/cleanup.ts`).
- `package.json` has an `overrides` block pinning patched versions of a few
  transitive dependencies. Re-check with `npm audit --omit=dev` when
  upgrading, and drop an override once the package that pulled it in has
  caught up.
- i18n is cookie-based (not localStorage), so pages render in the correct
  language on the very first server response instead of flashing English.
  Every server-component page calls `getLang()` + `t(lang, key)`
  (`src/lib/i18n/`); new strings need a key in both `en` and `he` in
  `src/lib/i18n/dictionary.ts` — TypeScript won't catch a missing
  translation, only a missing key.
- Form actions follow a `useActionState`-based pattern (`{error}` return
  values, not throws) via the shared `ActionForm`/`AuthForm` components.
