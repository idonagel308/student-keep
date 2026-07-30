# Course Tracker

A small app for keeping track of a semester's coursework: which lectures
you've watched, what homework is due and when, and how far along each course
is. Built with Next.js, Postgres (via Prisma), and Vercel Blob for file
storage.

Data is organized as semesters → courses → lectures and homework. Each course
tracks a lecture count so you can see watched/total progress at a glance, and
homework items can have a due date, an assignment file, and your own
answer (either typed text or an uploaded file). Everything is scoped to a
signed-in user — there's no sharing between accounts.

Accounts are invite-gated: signup requires a shared invite code, so this
isn't meant to be a public sign-up app. It's built for a small group of
people you hand the code to yourself.

## Stack

- Next.js (App Router, server actions)
- PostgreSQL, accessed through Prisma
- Vercel Blob for uploaded PDFs (assignment files, answer files)
- Cookie-based sessions signed with a server-side secret, no external auth provider

## Running it locally

You'll need Node.js and a Postgres database (a free [Neon](https://neon.tech)
database works fine, which is also what production uses).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` / `DIRECT_URL` — your Postgres connection strings. If your
     provider only gives you one connection string, use it for both.
   - `BLOB_READ_WRITE_TOKEN` — from Vercel's Blob storage dashboard, needed for
     file uploads. You can leave this blank if you don't need uploads to work.
   - `SESSION_SECRET` — a random secret used to sign session cookies. Generate
     one with:

     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

   - `SIGNUP_INVITE_CODE` — whatever code you want to require for signup. Pick
     something and share it with whoever you want to be able to create an
     account.

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

## Deploying

The app is set up to deploy on Vercel with a Neon Postgres database attached,
but any host that can run a Next.js app and reach a Postgres database will
work. A couple of things that aren't obvious if you're setting this up fresh:

- Set the same four environment variables (`DATABASE_URL`, `DIRECT_URL`,
  `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`, `SIGNUP_INVITE_CODE`) in your
  host's environment settings — they don't get picked up from `.env`
  automatically in production.
- The build script (`scripts/migrate-if-production.js`) runs pending
  migrations automatically during a production build, but skips preview
  builds so a preview deploy can't run migrations against your real database.
- If you're on Vercel, make sure the project's Framework Preset is actually
  set to Next.js in Settings → Build and Deployment — it can default to
  "Other" depending on how the project was created, which will make every
  route 404.

## Notes on how it's built

- Every page and server action checks the signed-in user server-side before
  touching the database — there's no page that trusts a client-supplied user
  ID.
- Uploaded files (PDFs) are stored in Vercel Blob as private objects and
  served through a route that checks the requesting user owns the file before
  streaming it back, rather than relying on an unguessable URL.
- Login and signup are rate-limited per account/IP using a database table
  (not in-memory), since serverless functions don't share memory between
  invocations.
