# Student Keep — Session Summary (2026-07-30)

Read this at the start of tomorrow's session to pick up where we left off.

## What shipped today

**Full Broadsheet UI overhaul** (design imported via `DesignSync` from the
Claude Design project) — reskinned every existing page (login, signup,
semesters list, semester view, course view) to the newsprint/serif design,
preserving every server action's `formData` field names exactly. Renamed
the app-facing brand from "Course Tracker" to **Student Keep** to match the
deployed domain. Added a show/hide password toggle and a confirm-password
field on signup.

**Full feature build**, following `FULL_FEATURE_BUILD_PLAN.md` (11 phases,
all built and verified against a real production build, not just dev mode):
- **Schema**: `Lecture.scheduledDate` (auto-assigned weekly from the
  semester start date when a course is created, continues the cadence when
  lectures are added, manually overridable per lecture), `Course.examScore`
  (kept in its own action, `setCourseGrade`, separate from `updateCourse` —
  editing a course's other details can no longer silently wipe its grade),
  `User.degreeName` / `User.creditsRequired`.
- **Full English/Hebrew i18n** — cookie-based (not localStorage), so pages
  render the correct language on the very first server response instead of
  flashing English. RTL layout, Frank Ruhl Libre font swap for Hebrew.
  Every string in every page/component is translated.
- **Settings panel** (gear icon in header): appearance, language, degree
  name/credits, account info, log out, and — added later today — **account
  deletion** behind a translated warning + confirm dialog. Cascades to every
  semester/course/lecture/homework row; no undo.
- **3-tab navigation**: This week / Degree / Semesters. `/` is now the This
  Week dashboard; the old semesters list moved to `/semesters`.
- **This Week page**: due-homework spans every semester (including
  overdue), lectures shown are scoped to whichever semester is currently
  active.
- **Degree page**: credits-weighted GPA (ungraded and zero-credit courses
  excluded from the average, pass threshold is 60), per-semester breakdown,
  searchable graded-courses list.
- **Pace indicator** (semester page): ahead/behind/on-pace vs. lectures
  actually scheduled to date. **Semester status grouping**: In progress /
  Planned / Completed sections on the semesters list.

**Real bugs caught via live testing at each phase** (not just code review),
fixed before merging:
- Editing a course would have silently wiped its grade (fixed by splitting
  grade-setting into its own action).
- A stale `.nav-brand { margin-right: auto }` broke the new header layout
  once nav tabs were added.
- A pre-existing hydration-mismatch console warning from the theme
  blocking script — switched to `next/script` (`strategy="beforeInteractive"`),
  the documented Next.js pattern for this exact case.
- `NavTabs` mixed the `textDecoration` shorthand with `textDecorationColor`/
  `Thickness` longhand in the same style object — a real React warning, not
  cosmetic.
- Lecture titles fell back to hardcoded English ("Lecture N") even in
  Hebrew mode — now routes through the dictionary.

**Deployed**: merged to `main`, pushed, verified live — `/degree` now
redirects to login instead of 404ing (confirms the new routes deployed),
security headers unchanged, no manual Vercel Promote needed this time.

**Current live invite code:** `p_ehS3aZa-6R`

## Known accounts in the DB right now

- All accounts were deleted today at your request (both `ido@example.com`
  and `idonagel@gmail.com`, plus all their data) before pushing.
- As of the end of this session, `idonagel@gmail.com` exists again — you
  must have signed back up on the live site after the wipe. Treat it as
  your real account unless told otherwise.

## Decisions needed before next implementation

- **R2_MIGRATION.md** (untracked, not yet committed) — a plan to move file
  storage from Vercel Blob to Cloudflare R2 (better free-tier fit for a
  mostly-PDF, read-heavy bucket). **Nothing in the app has been touched by
  this yet — it's a proposal only.** Before implementing it: confirm this
  is still wanted, decide whether to do the one-time data migration for any
  files already uploaded under the current account, and confirm the R2
  credentials/bucket exist. The doc itself lists exactly what would change
  (`src/lib/blob.ts`, the `/api/files/[...path]` route, env vars) and — just
  as importantly — what should *not* be introduced (no new upload route, no
  new table, no presigned-URL scheme replacing the existing ownership
  check). Read the file in full before starting; don't re-derive the plan
  from scratch.

## Known quirks / things to remember

- Git remote: `https://github.com/idonagel308/student-keep.git`, branch
  `main`. No `gh` CLI installed locally — commits use
  `git -c user.name=... -c user.email=...` matching the existing repo
  author (`idonagel308 <idonagel@gmail.com>`) since no global git identity
  is configured on this machine.
- Local `.env` holds real secrets (DB, Blob, session secret, invite code) —
  gitignored correctly, never committed. It points at the **same Neon DB**
  used by the live production site — local testing writes/deletes real
  production data, not a separate dev database.
- Form actions across the app follow a `useActionState`-based pattern
  (`{error}` return values, not throws) for anything wired through
  `ActionForm` or `AuthForm` — keep this pattern for any new forms.
- i18n pattern: every server-component page calls `getLang()` + `t(lang,
  key)`; client components receive `lang` as a prop threaded down from
  their server-component parent. New dictionary keys go in
  `src/lib/i18n/dictionary.ts` (both `en` and `he` — TypeScript won't catch
  a missing translation, only a missing key).
- Never create test accounts directly on the live production site
  (`student-keep.vercel.app`) — use the local dev server for testing
  (`npm run dev` / the `student-keep-dev` launch config), which hits the
  same DB, then clean up test accounts via direct SQL afterward.

## Recommended next-session opening move

Read this file, then ask what's next — there's no pre-committed task list
left from today's plan (`FULL_FEATURE_BUILD_PLAN.md` is fully done). The
main open item is the R2 migration decision above, if that's the next
priority.
