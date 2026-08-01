# Syncing lectures and assignments to Google Calendar / Google Tasks

This is a plan, not a change — nothing in the app is touched by this document.
It's written so that when you're ready to build this, you can start typing
code on line 1 instead of re-deriving the design. Read it in full before
starting.

Supersedes the earlier draft of this doc, which scoped this as admin-only
and homework-only. Decided otherwise on 2026-07-31: every user who wants to
gets their own connection, with two independent choices.

## What this is

Any signed-in user can connect their own Google account from Settings. Once
connected, two independent toggles control what syncs:

- **Lectures → Google Calendar events.** Each lecture becomes a timed
  calendar event on its `scheduledDate`.
- **Assignments (homework) → Google Tasks.** Each homework item becomes a
  task with a due date. Marking homework complete in the app marks the
  matching task complete in Google Tasks too — Tasks has a real
  completed/not-completed state, unlike a calendar event, which is why
  homework maps to Tasks and lectures map to Calendar rather than everything
  going to one or the other.

**One-way sync**: the app writes to Google; Google is never read back into
the app. Editing or completing the event/task directly in Google has no
effect on the app's data — don't build that direction, it turns this into a
much harder two-way-sync problem for no real benefit here.

**On connect, existing data backfills.** Enabling a toggle doesn't just
apply going forward — it walks the user's existing lectures/homework and
creates the missing events/tasks immediately, same logic path as
create-on-save, just run once over everything instead of one row.

## Why this is still mostly OAuth plumbing, not big feature work

The per-item logic is small — one HTTP call on save, one on delete, for two
resource types instead of one. Almost all the real work is one-time OAuth
plumbing, and per-user tokens don't change that shape at all (each user's
tokens just live on their own `User` row).

None of this needs the official `googleapis` npm package — it's four REST
endpoints (token exchange + Calendar events + Tasks), all plain `fetch`,
consistent with how the app already talks to R2 directly via signed
requests rather than pulling in a heavy client library.

## Step 0 — Google Cloud setup (console, not code) — you do this part

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
   (or reuse one if you already have one for something else).
2. Enable both APIs for that project (APIs & Services → Library → search
   and Enable each):
   - **Google Calendar API**
   - **Google Tasks API**
3. Configure the **OAuth consent screen**:
   - User type: **External** (personal Gmail accounts can't use "Internal"
     — that's only for Google Workspace orgs).
   - Publishing status: **Testing** (decided 2026-07-31 — matches the
     invite-only, small-friend-group nature of signup itself; going to
     "In production" needs Google's multi-week verification review for
     sensitive scopes like these, which isn't worth it here).
   - **Every friend who wants to use this must be added, by their Google
     account email, to the "Test users" list on this consent screen —
     manually, by you, in this console.** This is not a one-time step; it's
     ongoing maintenance every time someone new wants to connect. Apps in
     Testing status also have refresh tokens that expire after 7 days
     *except* for accounts on this test-user list, which is the other
     reason this list matters — without being on it, a friend's connection
     would silently stop working a week later.
   - Scopes: request exactly two —
     `https://www.googleapis.com/auth/calendar.events` (create/read/
     update/delete events, not the broader `calendar` scope which also
     grants calendar *settings* access nothing here needs) and
     `https://www.googleapis.com/auth/tasks` (full task management —
     `tasks.readonly` isn't enough since this creates/updates/deletes).
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
(see the R2 storage section of `README.md`).

## Step 2 — Schema changes

```prisma
model User {
  // ...existing fields...

  /// Google's long-lived refresh token, used to mint short-lived access
  /// tokens on demand. Null means "not connected." Same trust boundary as
  /// passwordHash - see "Storing the refresh token safely" below for
  /// whether to encrypt it at rest.
  googleRefreshToken String? @map("google_refresh_token")

  /// Cached short-lived access token + its expiry, so most saves don't
  /// need a token-refresh round trip first. Both null when disconnected or
  /// never fetched yet.
  googleAccessToken       String?   @map("google_access_token")
  googleAccessTokenExpiry DateTime? @map("google_access_token_expiry")

  /// Independent per-user toggles - either, both, or neither can be on.
  /// Both default false; only meaningful when googleRefreshToken is set.
  syncLecturesToCalendar  Boolean @default(false) @map("sync_lectures_to_calendar")
  syncHomeworkToTasks     Boolean @default(false) @map("sync_homework_to_tasks")
}

model Lecture {
  // ...existing fields...

  /// The Google Calendar event id this lecture is mirrored to. Null if
  /// never synced (sync disabled, not connected, or sync failed).
  googleEventId String? @map("google_event_id")
}

model Homework {
  // ...existing fields...

  /// The Google Tasks task id this homework is mirrored to. Null if never
  /// synced.
  googleTaskId String? @map("google_task_id")
}
```

Run `prisma migrate dev` after adding these (check `package.json` for the
project's current migration workflow — see `README.md`).

## Step 3 — `src/lib/google/` (new directory)

Split into a few files rather than one, since there's now real logic for
two different Google APIs plus shared OAuth plumbing:

### `src/lib/google/auth.ts` — OAuth + token management (shared)

- `getConnectUrl(state: string): string` — builds Google's OAuth
  authorization URL with `client_id`, `redirect_uri`, `response_type=code`,
  `scope` = **both** scopes space-separated
  (`calendar.events` + `tasks`), **`access_type=offline`** (required —
  without this, Google never issues a refresh token, only a short-lived
  access token), and **`prompt=consent`** (also required on every connect —
  Google only returns a refresh token on the *first* consent grant unless
  you force the consent screen again; without this, reconnecting after a
  disconnect silently fails to produce a new refresh token).
- `exchangeCodeForTokens(code: string)` — `POST
  https://oauth2.googleapis.com/token` with `code`, `client_id`,
  `client_secret`, `redirect_uri`, `grant_type=authorization_code`. Returns
  `{ access_token, refresh_token, expires_in }`.
- `refreshAccessToken(refreshToken: string)` — same endpoint,
  `grant_type=refresh_token`. Returns a new `{ access_token, expires_in }`
  (no new refresh token — the original keeps working indefinitely for
  accounts on the test-user list, per Step 0).
- `getValidAccessToken(user)` — the function everything else calls. Checks
  `user.googleAccessTokenExpiry`; if still valid, returns the cached token;
  if expired (or missing), calls `refreshAccessToken`, saves the new token
  + expiry back to the `User` row, returns it. One scope covers both APIs —
  a single access token works for both Calendar and Tasks calls, since both
  were requested together in Step 0/the connect URL.

### `src/lib/google/calendar.ts` — lecture sync

- `createCalendarEvent(accessToken, lecture, courseName)` — `POST
  https://www.googleapis.com/calendar/v3/calendars/primary/events`:
  ```json
  {
    "summary": "<courseName>: Lecture <number>[ - <title>]",
    "start": { "date": "YYYY-MM-DD" },
    "end": { "date": "YYYY-MM-DD" }
  }
  ```
  All-day event (`date`, not `dateTime`) — `Lecture.scheduledDate` is a
  date, not a time, and using `dateTime` would force an arbitrary decision
  about what time of day a lecture "is," which nothing in this app tracks.
  Returns the created event's `id`, stored in `Lecture.googleEventId`.
- `updateCalendarEvent(accessToken, eventId, lecture, courseName)` —
  `PATCH` the same URL + `/{eventId}`.
- `deleteCalendarEvent(accessToken, eventId)` — `DELETE` the same
  `/{eventId}` URL. Treat 404/410 (already gone) as success.

### `src/lib/google/tasks.ts` — homework sync

- `createTask(accessToken, homework, courseName)` — `POST
  https://tasks.googleapis.com/tasks/v1/lists/@default/tasks`:
  ```json
  {
    "title": "<courseName>: <homework name>",
    "notes": "<homework details, if any>",
    "due": "YYYY-MM-DDT00:00:00.000Z",
    "status": "needsAction"
  }
  ```
  Google Tasks' API technically wants a full RFC3339 timestamp for `due`
  even though its own UI only ever displays the date part — midnight UTC on
  the due date is the simplest choice, same "sidestep timezones by not
  caring about time-of-day" reasoning as the Calendar event above. Returns
  the created task's `id`, stored in `Homework.googleTaskId`.
- `updateTask(accessToken, taskId, homework, courseName)` — `PATCH` the
  same URL + `/{taskId}`. Also where completion syncs: set `status` to
  `"completed"` or `"needsAction"` based on `homework.completed`.
- `deleteTask(accessToken, taskId)` — `DELETE` the same `/{taskId}` URL.
  Treat 404 (already gone) as success.

### `src/lib/google/backfill.ts` — one-time sync-everything-on-connect

- `backfillLectures(user, accessToken)` — fetch all of the user's lectures
  (across every course/semester) that don't already have a
  `googleEventId`, call `createCalendarEvent` for each, save the id. Called
  once when `syncLecturesToCalendar` is switched on (either at connect time
  if both toggles are enabled together, or later if the user flips the
  toggle on after already being connected).
- `backfillHomework(user, accessToken)` — same shape, over homework rows
  missing `googleTaskId`, using `createTask`.
- Both should be resilient to partial failure: wrap each individual
  create in its own `try/catch`, keep going on error, don't let one bad
  row abort the whole backfill. Not every row needs a due date to make
  sense to backfill (homework with no due date has nothing to sync — skip
  it silently, not an error).

## Step 4 — Connect/disconnect routes and settings actions

- **`src/app/api/google/connect/route.ts`** (GET): `requireUser()`,
  generate a random `state` value, store it in a short-lived `httpOnly`
  cookie (e.g. `google_oauth_state`, 10-minute expiry), `redirect()` to
  `getConnectUrl(state)`.

  The `state` round-trip is not optional decoration — it's the CSRF defense
  for the whole flow. Without it, an attacker can start their *own* OAuth
  flow, capture the resulting authorization code, and trick a logged-in
  victim into completing the callback with the attacker's code — linking
  the attacker's Google account to the victim's app account. Comparing the
  `state` your server generated against the `state` Google echoes back
  closes that off.

- **`src/app/api/google/callback/route.ts`** (GET): reads `?code&state`,
  `requireUser()`, compares `state` against the `google_oauth_state`
  cookie (reject + redirect to `/?error=google` on mismatch, delete the
  cookie either way — it's single-use), calls `exchangeCodeForTokens(code)`,
  saves `googleRefreshToken` + `googleAccessToken` +
  `googleAccessTokenExpiry` on the `User` row, redirects to `/` (or
  wherever Settings is reachable from) with a success indicator so the
  Settings UI can prompt for which toggles to enable.

- **`setGoogleSyncPreferences` server action** (new, in
  `src/app/actions/settings.ts`): takes the two boolean toggles from a
  form, updates `User.syncLecturesToCalendar` / `syncHomeworkToTasks`. For
  each toggle that flips from off to on, call the matching backfill
  function (Step 3) before returning — this is the "backfill everything on
  connect" behavior, and it also fires correctly if a user connects but
  only enables one toggle at first, then enables the other later.

- **`disconnectGoogleCalendar` server action** (same file): sets
  `googleRefreshToken`, `googleAccessToken`, `googleAccessTokenExpiry`,
  `syncLecturesToCalendar`, `syncHomeworkToTasks` all back to
  null/false. Does not need to call Google to revoke the token remotely for
  this to be safe — clearing the refresh token server-side means the app
  can no longer use it. (Optionally, for tidiness, `POST
  https://oauth2.googleapis.com/revoke?token=<refresh_token>` first, so it
  also stops showing under "Third-party access" on the Google account
  itself — nice-to-have, not required.) Existing `googleEventId`/
  `googleTaskId` values on lectures/homework are left as-is (harmless,
  orphaned references) rather than cleaned up — reconnecting later just
  means new items get new events/tasks; not worth the complexity of
  deleting everything from Google on disconnect.

## Step 5 — Settings UI

In `Settings.tsx`, add a "Google Calendar & Tasks" section, same pattern as
the existing Appearance/Language/Degree sections, visible to **every**
user (no admin gate this time):

- If `user.googleRefreshToken` is null: a "Connect Google" link/button
  pointing at `/api/google/connect`, with a short explanation of what
  connecting does (syncs lectures/assignments, one-way, disconnect anytime).
- If connected: "Connected ✓", two independent checkboxes/toggles —
  "Sync lectures to Google Calendar" and "Sync assignments to Google
  Tasks" — wired to `setGoogleSyncPreferences`, plus a "Disconnect" button
  wired to `disconnectGoogleCalendar` (no scary confirm dialog needed —
  disconnecting is easily reversible by reconnecting, unlike account
  deletion).

## Step 6 — Hook into the lecture and homework actions

**Every calendar/tasks call in both action files must be wrapped in its own
`try/catch` that only logs, never returns an error to the user or blocks
the save.** Sync is a nice-to-have layered on top of the core features
(tracking lectures/homework); those must keep working if Google's API is
down, a token refresh fails because access was revoked, or anything else
network-shaped goes wrong. This mirrors the existing pattern in
`maybeUpload`, except deliberately the opposite way: a failed PDF upload
*does* surface as a form error since the user's data didn't save as
expected, but a failed calendar/task sync just means the mirror is
momentarily out of date — it resolves itself silently on the next edit.

In `src/app/actions/lectures.ts` (`createLecture`-equivalent /
`updateLecture` / `deleteLecture` / wherever lecture rows are
created-with-a-course, since lectures are also bulk-created in
`createCourse`): if `user.syncLecturesToCalendar` is true, call
`createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent` as
appropriate and save/clear `googleEventId`. Bulk creation (new course, or
extending lecture count) needs a loop, not a single call — each lecture is
its own event.

In `src/app/actions/homework.ts` (`createHomework`/`updateHomework`/
`deleteHomework`/`toggleHomework`): if `user.syncHomeworkToTasks` is true —
- **create**: if `dueDate` is set, `createTask`, save `googleTaskId`.
- **update**: same three cases as the original homework-only plan — due
  date newly set → create; due date still set → update; due date cleared →
  delete task, clear `googleTaskId`.
- **delete**: if `googleTaskId` is set, delete the task.
- **toggle** (mark done/not done): if `googleTaskId` is set, `updateTask`
  with the new `status` — this is the one place completion state syncs.

## Step 7 — Testing checklist (do this against your own account first)

- [ ] Connect flow: Settings → Connect → Google consent screen (shows both
      Calendar and Tasks permission requests) → redirected back → Settings
      shows "Connected."
- [ ] Enable "Sync lectures" with existing lectures already in the app →
      confirm they all appear on Google Calendar (backfill), correct
      course name/number/date, no duplicates if you toggle it off and on
      again.
- [ ] Enable "Sync assignments" with existing homework already in the app
      → confirm they all appear in Google Tasks (backfill), correct
      title/notes/due date.
- [ ] Create a new lecture / edit an existing one's date → event
      appears/moves, no duplicate.
- [ ] Create new homework with a due date → task appears. Edit the due
      date → same task moves. Clear the due date → task disappears. Mark
      complete in the app → task shows completed in Google Tasks.
- [ ] Delete a lecture / a homework item → matching event/task disappears.
- [ ] Disconnect → sync stops, no errors on further edits, both toggles
      reset.
- [ ] Reconnect after disconnecting → still works, gets a fresh refresh
      token (`prompt=consent` doing its job).
- [ ] Simulate revoked access: remove the app's access at
      [myaccount.google.com/permissions](https://myaccount.google.com/permissions),
      then edit a lecture/homework item — confirm the save still succeeds,
      no user-facing error.
- [ ] **Second account test** — sign up (or use existing) a second test
      account, add its Google email to the Cloud Console test-user list,
      connect it independently, confirm its sync is fully separate from
      the first account's (own toggles, own events/tasks, disconnecting
      one doesn't touch the other).

## What this should *not* grow into

- No two-way sync — editing the Google Calendar event or Google Task
  directly should have zero effect on the app.
- No syncing exam dates/grades — scoped to lectures and homework only,
  since that's the actual ask.
- No broader `calendar`/`tasks.readonly`-only scopes than specified above.
- No move to the `googleapis` npm package — plain `fetch`, same reasoning
  as the R2 integration.
- No "In production" verification submission — Testing mode + manually
  maintaining the test-user list is the deliberate choice for this
  friend-group-sized app (see Step 0).

## Storing the refresh token safely

A Google refresh token is equivalent to a password for whatever it's scoped
to (here: someone's calendar and tasks) — it must never be logged, and
ideally isn't stored as plain text even though the DB is already a trusted
boundary in this app (same trust level as `passwordHash`, except a refresh
token has to be *reversible* to be useful, so hashing it like a password
isn't an option). This matters more now than in the admin-only draft, since
a leak here would expose every connected user's tokens, not just one.

Two reasonable options, in increasing order of effort:

1. **Store it as-is in the `User.googleRefreshToken` column.** Consistent
   with how the app already treats the Postgres database as a trusted
   boundary (no field-level encryption exists anywhere else in the schema).
2. **Encrypt the column at the application layer** with a symmetric key
   from a new env var (e.g. `GOOGLE_TOKEN_ENCRYPTION_KEY`, same rigor as
   `SESSION_SECRET`) using Node's built-in `crypto` (AES-256-GCM) before
   writing, decrypt on read in `getValidAccessToken`. The more defensible
   choice now that multiple users' tokens live in the same table — worth
   leaning toward option 2 here specifically because of that, even though
   the admin-only draft called it optional.

## Rough effort

Medium, up from "half a day" in the admin-only draft — two Google APIs
instead of one, backfill logic, and a real per-user settings UI with two
toggles instead of a single connect/disconnect button. Roughly:
- ~30 min: Google Cloud Console setup (Step 0) — you do this part.
- ~2-3 hrs: OAuth plumbing + `src/lib/google/` (auth, calendar, tasks,
  backfill).
- ~1-1.5 hrs: connect/callback/disconnect routes + Settings UI with the two
  toggles.
- ~1.5-2 hrs: wiring into lecture actions (including bulk-create in
  `createCourse`) and homework actions (including `toggleHomework` for
  completion sync).
- ~1 hr: testing checklist, including the two-account isolation test.

Call it **a full day**, most of it still one-time plumbing (shared between
both resource types) rather than logic repeated per action.
