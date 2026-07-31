# Syncing homework due dates to Google Calendar

This is a plan, not a change — nothing in the app is touched by this document.
It's written so that when you're ready to build this, you can start typing
code on line 1 instead of re-deriving the design. Read it in full before
starting.

## What this is

When you add or edit a homework item with a due date, the app creates (or
updates) a matching event on your Google Calendar. Delete the homework, or
clear its due date, and the event goes away too. **One-way sync**: the app
writes to Google Calendar; Google Calendar is never read back into the app.
Editing the event directly in Google Calendar has no effect on the app's
data — don't build that direction, it turns this into a much harder
two-way-sync problem for no real benefit here.

**Admin-only**: this app is meant to grow beyond just you (invite-coded
signups for friends), but Google Calendar sync is *your* feature, not
theirs. Every part of this plan below — the Settings UI section, the
connect/callback routes, and the sync calls in the homework actions — must
be gated behind an admin check, not just left available to whoever
connects first. This is spelled out concretely in Step 2.5 below; don't
skip it when implementing, since without it any invited friend could
connect their own Google account and get the same feature "for free," or
worse, a bug could let someone trigger the connect flow for an account
that isn't theirs.

## Why this is a half-day job, not a big feature

The actual per-homework logic is small — one HTTP call on save, one on
delete. Almost all the real work is one-time OAuth plumbing:

1. A Google Cloud project + OAuth client (one-time, ~15 minutes, done in the
   browser, not code).
2. A connect/callback flow so *your* Google account grants the app
   permission once, and the app can keep using that permission afterward.
3. Storing what that flow gives you (a refresh token) safely and using it to
   get short-lived access tokens on demand.

None of this needs the official `googleapis` npm package — it's a large,
heavy SDK for a job that's two REST calls (token exchange + Calendar API).
Plain `fetch` keeps this consistent with how the app already talks to R2
directly via signed requests rather than pulling in a big client library
for something simple.

## Step 0 — Google Cloud setup (console, not code)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
   (or reuse one if you already have one for something else).
2. Enable the **Google Calendar API** for that project (APIs & Services →
   Library → search "Google Calendar API" → Enable).
3. Configure the **OAuth consent screen**:
   - User type: **External** (personal Gmail accounts can't use "Internal" —
     that's only for Google Workspace orgs).
   - Publishing status: leave it in **Testing**, not "In production." Add
     your own Google account under "Test users."
   - **This is the load-bearing detail**: apps in Testing status with
     sensitive scopes (Calendar is one) normally have refresh tokens that
     expire after 7 days — *except* for accounts explicitly added as test
     users, which don't have that expiry. Since this is a single-user app
     and you're the only test user, staying in Testing forever is
     correct — don't submit for Google's verification review, you don't
     need it and it's a multi-week process aimed at public-facing apps.
   - Scope: request only `https://www.googleapis.com/auth/calendar.events`
     (create/read/update/delete events), not the broader `calendar` scope
     (which would also grant calendar *settings* access this app never
     needs). Least privilege, and a narrower scope is also less likely to
     ever trigger a review requirement.
4. Create an **OAuth client ID** (Credentials → Create Credentials → OAuth
   client ID → Application type: **Web application**):
   - Authorized redirect URIs: add both
     `http://localhost:3000/api/google/callback` (dev) and
     `https://<your-production-domain>/api/google/callback` (prod).
   - Save the generated **Client ID** and **Client Secret**.

## Step 1 — Env vars

Add to `.env` / `.env.example` (following the existing pattern for secrets
like `SESSION_SECRET`):

```
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="...."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"   # prod value set in Vercel env vars
```

No `NEXT_PUBLIC_*` variables needed — the whole OAuth exchange happens
server-side, same reasoning as why R2 credentials never needed to be public
(see `R2_MIGRATION.md`).

## Step 2 — Schema changes

Two small additions, no new tables:

```prisma
model User {
  // ...existing fields...

  /// Google's long-lived refresh token, used to mint short-lived access
  /// tokens on demand. Encrypted at rest — see the "Storing the refresh
  /// token safely" section below. Null means "not connected."
  googleRefreshToken String? @map("google_refresh_token")

  /// Cached short-lived access token + its expiry, so most homework saves
  /// don't need a token-refresh round trip first. Both null when
  /// disconnected or the cached token has never been fetched yet.
  googleAccessToken       String?   @map("google_access_token")
  googleAccessTokenExpiry DateTime? @map("google_access_token_expiry")
}

model Homework {
  // ...existing fields...

  /// The Google Calendar event id this homework is mirrored to, so an
  /// edit or delete can target the right event instead of creating
  /// duplicates. Null if never synced (no due date yet, sync failed, or
  /// Google Calendar wasn't connected when this was created).
  googleEventId String? @map("google_event_id")
}
```

Run `prisma migrate dev` (or whatever the project's current migration
workflow is — check `package.json` scripts) after adding these.

## Step 2.5 — Admin gating (do this before Steps 3-6, not after)

No schema change needed for this — no `isAdmin` column, no role table. The
simplest correct check for a single, known admin account is comparing the
logged-in user's email against an env var, the same pattern the app
already uses for `SIGNUP_INVITE_CODE`:

```
# .env / .env.example
ADMIN_EMAIL="idonagel@gmail.com"
```

Add one helper to `src/lib/dal.ts`, next to the existing `requireUser`:

```ts
/** True only for the single admin account (Google Calendar sync, etc). */
export async function isAdmin(user: { email: string }) {
  return user.email === process.env.ADMIN_EMAIL;
}

/** Like requireUser, but redirects non-admins away instead of just
 *  non-logged-in users. Use this in the connect/callback routes. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!(await isAdmin(user))) redirect("/");
  return user;
}
```

Then apply it at all three layers — each one matters independently, don't
rely on just one:

1. **Settings UI** (`Settings.tsx`): only render the "Google Calendar"
   section at all when `isAdmin(user)` is true. A friend's account
   shouldn't even see a "Connect Google Calendar" button exists.
2. **The routes** (`/api/google/connect`, `/api/google/callback`): call
   `requireAdmin()` instead of `requireUser()` at the top of each. This is
   the layer that actually matters for security — hiding the button in the
   UI is just good UX, it's not what stops a friend from hitting
   `/api/google/connect` directly by typing the URL. Without this check,
   *any* logged-in user could complete the OAuth flow and get their own
   `googleRefreshToken` populated, since nothing else in Steps 3-4 as
   written restricts who can connect.
3. **The homework actions** (`createHomework`/`updateHomework`/
   `deleteHomework`): guard the calendar-sync block with `if (await
   isAdmin(user))` before calling any `googleCalendar.ts` function, even
   though in practice only the admin's `User` row should ever have a
   non-null `googleRefreshToken` if layer 2 is correctly in place. This is
   defense in depth, not redundant — it means a future bug in the connect
   flow (or someone manually poking the DB) still can't cause a non-admin's
   homework saves to start calling the Calendar API using leftover token
   fields.

## Step 3 — `src/lib/googleCalendar.ts` (new file)

Functions to write, all server-only:

- `getConnectUrl(state: string): string` — builds Google's OAuth
  authorization URL with `client_id`, `redirect_uri`, `response_type=code`,
  `scope=https://www.googleapis.com/auth/calendar.events`,
  **`access_type=offline`** (required — without this, Google never issues a
  refresh token, only a short-lived access token), and **`prompt=consent`**
  (also required on every connect — Google only returns a refresh token on
  the *first* consent grant unless you force the consent screen again;
  without `prompt=consent`, reconnecting after a disconnect silently fails
  to produce a new refresh token).
- `exchangeCodeForTokens(code: string)` — `POST
  https://oauth2.googleapis.com/token` with `code`, `client_id`,
  `client_secret`, `redirect_uri`, `grant_type=authorization_code`. Returns
  `{ access_token, refresh_token, expires_in }`.
- `refreshAccessToken(refreshToken: string)` — same endpoint,
  `grant_type=refresh_token`. Returns a new `{ access_token, expires_in }`
  (no new refresh token — the original keeps working indefinitely as a test
  user, per Step 0).
- `getValidAccessToken(user)` — the function everything else calls. Checks
  `user.googleAccessTokenExpiry`; if still valid, returns the cached token;
  if expired (or missing), calls `refreshAccessToken`, saves the new token
  + expiry back to the `User` row, and returns it. This is the piece that
  makes every calendar call in the homework actions a one-liner instead of
  repeating token-refresh logic three times.
- `createCalendarEvent(accessToken, homework)` — `POST
  https://www.googleapis.com/calendar/v3/calendars/primary/events` with:
  ```json
  {
    "summary": "<course name>: <homework name>",
    "description": "<homework details, if any>",
    "start": { "date": "YYYY-MM-DD" },
    "end": { "date": "YYYY-MM-DD" }
  }
  ```
  **Use an all-day event (`date`, not `dateTime`)** — the homework form only
  ever collects a due *date*, not a time. Using `dateTime` would force a
  decision about which timezone the "due at midnight" moment means, which
  is a real, easy-to-get-wrong problem this app has no need to take on. An
  all-day event on the due date sidesteps timezones entirely. Returns the
  created event's `id` — that's what gets stored in `Homework.googleEventId`.
- `updateCalendarEvent(accessToken, eventId, homework)` — `PATCH` the same
  URL + `/{eventId}` with the updated summary/description/date.
- `deleteCalendarEvent(accessToken, eventId)` — `DELETE` the same
  `/{eventId}` URL. Treat a 404/410 response (event already gone — e.g. you
  deleted it by hand in Google Calendar) as success, not an error.

## Step 4 — Connect/disconnect routes

- **`src/app/api/google/connect/route.ts`** (GET): `requireAdmin()` (not
  `requireUser()` — see Step 2.5), generate a random `state` value, store
  it in a short-lived `httpOnly` cookie (e.g. `google_oauth_state`,
  10-minute expiry), then `redirect()` to `getConnectUrl(state)`.

  The `state` round-trip is not optional decoration — it's the CSRF defense
  for the whole flow. Without it, an attacker can start their *own* OAuth
  flow, capture the resulting authorization code, and trick a logged-in
  victim into completing the callback with the attacker's code — linking
  the attacker's Google Calendar to the victim's account. Comparing the
  `state` your server generated against the `state` Google echoes back
  closes that off, the same category of protection CSRF tokens provide
  elsewhere.

- **`src/app/api/google/callback/route.ts`** (GET): reads `?code&state`,
  `requireAdmin()`, compares `state` against the `google_oauth_state` cookie
  (reject + redirect to `/settings?error=google` on mismatch, then delete
  the cookie either way — it's single-use), calls
  `exchangeCodeForTokens(code)`, saves `googleRefreshToken` +
  `googleAccessToken` + `googleAccessTokenExpiry` on the `User` row,
  redirects to `/settings`.

- **`disconnectGoogleCalendar` server action** (in
  `src/app/actions/settings.ts`, next to `setDegreeSettings`): sets all
  three Google fields on `User` back to `null`. Does *not* need to call
  Google to revoke the token remotely for this to be safe — clearing the
  refresh token server-side means the app can no longer use it, which is
  the only thing that matters. (Optionally, for tidiness, `POST
  https://oauth2.googleapis.com/revoke?token=<refresh_token>` before
  clearing it, so it also stops showing up under "Third-party access" on
  the Google account itself — a nice-to-have, not a security requirement.)

## Step 5 — Settings UI

In `Settings.tsx`, add a "Google Calendar" section (same pattern as the
existing Appearance/Language/Degree sections) — **wrapped in `{isAdmin &&
(...)}`, computed server-side in the parent page component and passed down
as a prop, the same way `user`/`degreeName` already reach `Settings` today.
Non-admin accounts get no trace of this section, not even a disabled one.**

- If `user.googleRefreshToken` is null: a "Connect Google Calendar" link/
  button pointing at `/api/google/connect`.
- If connected: "Connected ✓" + a "Disconnect" button wired to the new
  `disconnectGoogleCalendar` action (same `DeleteButton`/`ActionForm`
  pattern already used for account deletion, though this one doesn't need
  a scary confirm dialog — disconnecting is easily reversible by
  reconnecting).

## Step 6 — Hook into the homework actions

In `src/app/actions/homework.ts`, after the existing `prisma.homework.create`
/ `update` / `delete` calls — **each of the three blocks below must first
check `await isAdmin(user)` (see Step 2.5) before touching
`googleCalendar.ts` at all**:

- **`createHomework`**: if `dueDate` is set and the user has
  `googleRefreshToken`, call `createCalendarEvent` and save the returned
  event id onto the just-created row (`prisma.homework.update` with the
  `googleEventId`, or fold it into a single write if you restructure
  slightly).
- **`updateHomework`**: three cases —
  - had no due date, now has one → create the event, store the id.
  - had a due date and still does → update the existing event (only if
    `googleEventId` is set; if it's somehow null despite having a due date,
    e.g. sync failed originally, create one instead of erroring).
  - had a due date, now cleared → delete the event, clear `googleEventId`.
- **`deleteHomework`**: if `googleEventId` is set, delete the calendar
  event before (or after — order doesn't matter here) deleting the DB row.

**Critical rule for all three: wrap every calendar call in its own
`try/catch` that only logs, never returns an error to the user or blocks
the homework save.** Calendar sync is a nice-to-have layered on top of the
core feature (tracking homework); the core feature must keep working if:
Google's API is down, the access token refresh fails because you revoked
the app's access from your Google account settings, or anything else
network-shaped goes wrong. This mirrors the existing pattern in
`maybeUpload` where upload failures *do* surface as form errors — the
difference here is deliberate: a failed PDF upload means the user's data
didn't save as they expected, but a failed calendar sync just means a
calendar event doesn't exist yet, which resolves itself silently on the
next edit.

If you want the user to know sync is broken (e.g. access was revoked),
that's a "reconnect Google Calendar" prompt driven by checking whether
`refreshAccessToken` is failing with an `invalid_grant` error — surfaced as
a passive banner in Settings, not a blocking error on the homework form.

## Step 7 — Testing checklist (do this against your own test-user account)

- [ ] Connect flow: Settings → Connect → Google consent screen → redirected
      back → Settings shows "Connected."
- [ ] Create homework with a due date → event appears on your calendar with
      the right course name, title, and date (all-day, right day, not off
      by one due to timezone).
- [ ] Edit the due date → the *same* event moves, no duplicate created.
- [ ] Edit homework with no due date change → event's title/description
      still updates if you changed the name/details.
- [ ] Clear the due date on an existing homework → event disappears.
- [ ] Delete a homework item with a due date → event disappears.
- [ ] Disconnect in Settings → creating new homework no longer creates
      events, and doesn't error.
- [ ] Reconnect after disconnecting → still works (confirms `prompt=consent`
      is actually forcing a fresh refresh token each time).
- [ ] Simulate revoked access: go to
      [myaccount.google.com/permissions](https://myaccount.google.com/permissions),
      remove the app's access, then try creating a homework item — confirm
      the save still succeeds and doesn't throw a user-facing error.
- [ ] **Admin gating** — sign up a second (non-admin) test account: confirm
      Settings shows no Google Calendar section at all, and that hitting
      `/api/google/connect` directly while logged in as that account
      redirects away instead of starting the OAuth flow.

## What this should *not* grow into

- No two-way sync (see the top of this doc) — editing the Google Calendar
  event directly should have zero effect on the app.
- No syncing lectures or exam dates — this is scoped to homework due dates
  only, since that's the actual ask. If you want lecture dates on the
  calendar too later, it's the same pattern repeated, not a redesign.
- No broader `calendar` scope than `calendar.events` — there's no feature
  here that needs to read/write calendar *settings*.
- No move to the `googleapis` npm package — it's a large dependency for
  what's two REST endpoints; plain `fetch` keeps this consistent with how
  R2 was integrated (see `R2_MIGRATION.md`) and how the app already talks
  to Vercel Blob/R2 without a heavyweight SDK wrapper philosophy creeping
  in everywhere.
- No public verification / "in production" submission to Google — staying
  in Testing with yourself as the sole test user is correct for a
  single-user personal app and avoids weeks of unnecessary process.
- No per-account opt-in or "request access" flow for friends — this
  isn't a feature other accounts get access to at all, ever, by design
  (Step 2.5). If that changes later, it's a deliberate product decision to
  revisit, not a default to fall into.

## Storing the refresh token safely

A Google refresh token is equivalent to a password for your calendar — it
must never be logged, and ideally isn't stored as plain text in the
database even though the DB is already a trusted boundary in this app
(same trust level as `passwordHash`, except a refresh token has to be
*reversible* to be useful, so hashing it like a password isn't an option).

Two reasonable options, in increasing order of effort:

1. **Store it as-is in the `User.googleRefreshToken` column.** This is
   consistent with how the app already treats the Postgres database as a
   trusted boundary (no field-level encryption exists anywhere else in the
   schema either). Acceptable for a single-user personal app where the
   database itself is already the security perimeter.
2. **Encrypt the column at the application layer** with a symmetric key
   from a new env var (e.g. `GOOGLE_TOKEN_ENCRYPTION_KEY`, same rigor as
   `SESSION_SECRET`) using Node's built-in `crypto` (AES-256-GCM) before
   writing, and decrypt on read in `getValidAccessToken`. This is the more
   defensible choice if the DB connection string or a backup ever leaked
   without the app's other env vars leaking alongside it.

Pick option 1 to match the app's current posture, or option 2 if it's worth
the extra ~20 lines of encrypt/decrypt helpers to you. Either way, this is a
decision to make explicitly when you start, not something to skip past.

## Rough effort

Small-to-medium. Roughly:
- ~30 min: Google Cloud Console setup (Step 0).
- ~1-2 hrs: `googleCalendar.ts` + connect/callback routes + schema migration.
- ~15 min: `isAdmin`/`requireAdmin` helper (Step 2.5) — small, but don't
  skip it or bolt it on after the fact.
- ~1 hr: wiring into the three homework actions + Settings UI, with the
  admin checks included from the start.
- ~30-60 min: testing checklist, including the revoked-access and
  admin-gating cases.

Call it **half a day**, most of it OAuth plumbing done once, not homework-
specific logic repeated per action.
