# Full Feature Build Plan — matching the Broadsheet mock exactly

Status: **planning only — no code written yet.** This is the follow-up to
[UI_OVERHAUL_PLAN.md](UI_OVERHAUL_PLAN.md), which only reskinned the 5 pages that
already existed. This plan covers everything from the mock that wasn't built:
full English/Hebrew i18n with RTL, the "This week" and "Degree" pages, the
Settings panel, the pace indicator, and semester status grouping.

Formulas and scoping rules below were read directly out of the design file's
JS (`Course Tracker.dc.html`), not guessed — cite the line if you need to
re-verify: it's cached at
`C:\Users\idona\AppData\Local\Temp\claude\C--personal-project-student-keep\694f2160-2812-4b84-8fc9-3525344c827c\scratchpad\course_tracker_dc.html`.

## Ground rules (carried over from the reskin)

- Preserve every existing server action's `formData` field names exactly —
  see the list in [UI_OVERHAUL_PLAN.md](UI_OVERHAUL_PLAN.md) Step 1. Still applies to
  every field this plan touches.
- Keep the `useActionState`/`{error}` pattern in `ActionForm`/`AuthForm`.
- Commit after each numbered phase, in order — later phases depend on earlier
  ones (schema before pages, i18n foundation before translating pages).
- Re-run the full test pass (typecheck/lint/build + manual smoke test +
  security re-verification) before merging to `main`, same as last time.

## Phase 1 — Database schema changes

New Prisma migration adding four nullable columns (all optional, so existing
rows need no backfill):

| Model | Field | Type | Purpose |
|---|---|---|---|
| `User` | `degreeName` | `String?` | Degree page title / Settings "Degree name" field. Falls back to "Degree overview" if unset (mock: `degreeTitle()`). |
| `User` | `creditsRequired` | `Float?` | Degree page total. Falls back to **120** if unset (mock: `required()`). |
| `Course` | `examScore` | `Float?` | The course's final grade, 0–100. `null`/unset = "not graded yet" — excluded from GPA math entirely (not counted as 0). |
| `Lecture` | `scheduledDate` | `DateTime?` | **Hard dependency** for both the Pace indicator and the "Lectures this week" list — both compare against this field directly in the mock (`l.date`), not against any derived/assumed schedule. Without this column populated, Pace shows 0 lectures due and This Week's lecture list is always empty. |

**Scheduling design, confirmed by the user:** auto-scheduling is the default,
not an opt-in button. When a course is created with N total lectures, the app
assigns lecture 1 `= semester.startDate`, lecture 2 `= +7 days`, ... lecture N
`= +7*(N-1) days`, automatically, at creation time. No user action needed for
the common case.

- **Creating a course** (`createCourse` in `src/app/actions/courses.ts`):
  after creating the N `Lecture` rows it already creates, also set each one's
  `scheduledDate` per the weekly formula above.
- **Increasing `totalLectures` on an existing course** (`updateCourse`): the
  newly-added lecture rows continue the weekly cadence from the *last
  existing lecture's date* (not from the semester start again) — so
  extending a course doesn't reshuffle dates you may have already
  hand-edited. If the last lecture has no date for some reason, fall back to
  continuing from the semester start.
- **Decreasing `totalLectures`**: unaffected — this already deletes the
  excess `Lecture` rows, no scheduling logic involved.
- **Manual per-lecture override**: the mock's course page has a per-lecture
  edit icon (`l.edit`) that the current `LectureRow.tsx` doesn't have at all
  yet — `src/app/actions/lectures.ts` already contains an `updateLectureTitle`
  action (title only, no UI wired to it anywhere) that pre-dates this reskin.
  Extend it to also accept a date, rename/repurpose it as the backing action
  for a new small `LectureForm.tsx` modal (same `Modal`/`ActionForm` pattern
  as the other forms), and add the missing edit-icon button to `LectureRow.tsx`
  so title *and* date are both editable per lecture — this is genuinely new
  UI, not a restyle of something that existed.
- **Bulk re-schedule**: keep the mock's "Schedule weekly" button
  (`scheduleWeeklyHint: 'One lecture a week from the first day of term'`) as
  a secondary convenience — a manual "reset every lecture's date back to a
  clean weekly cadence from a chosen start date" action, for when someone's
  hand-edited dates get out of sync and they just want to start over. New
  action `scheduleLecturesWeekly(courseId, startDate)` in `lectures.ts`.

Steps:
1. Add the four columns to `prisma/schema.prisma`.
2. `npx prisma migrate dev --name add_degree_grade_scheduling` locally.
3. Update `createCourse`/`updateCourse` in `src/app/actions/courses.ts` to
   auto-assign/extend `scheduledDate` per the rules above, and to accept/persist `examScore`.
4. New action(s) in a `src/app/actions/settings.ts` (or extend `auth.ts`) for
   saving `degreeName`/`creditsRequired`.
5. Extend `updateLectureTitle` (or introduce `updateLecture`) in `lectures.ts`
   to accept a date; add `scheduleLecturesWeekly` for the bulk-reset button.
6. New `src/components/forms/LectureForm.tsx` + edit-icon button in
   `LectureRow.tsx` — the missing per-lecture edit UI.

## Phase 2 — i18n foundation

**Architecture decision, not a detail:** pages are Server Components that
fetch from Prisma and render server-side. Storing the language preference in
`localStorage` only (like theme) would mean the server always renders English
on first paint, then client-side text would have to swap post-hydration —
that's a hydration mismatch on every single piece of text on the page, far
worse than the theme case (theme only ever changed CSS variables, never
rendered content).

**Decision: persist language in a cookie**, not localStorage, so every server
component can read it before rendering and produce correct HTML on the first
response. Theme can stay as-is (localStorage + blocking script) since it
never affects rendered text.

Build:
1. `src/lib/i18n/dictionary.ts` — port the mock's full `DICT.en` / `DICT.he`
   objects (they're complete — see lines ~717–887 of the cached file above),
   adapted to this app's actual copy (drop demo-only strings like `pName:
   'Fall 2026'` placeholder seed values that don't apply to a real app).
2. `src/lib/i18n/getLang.ts` — server-side helper: `cookies().get('lang')?.value
   ?? 'en'`.
3. `src/lib/i18n/t.ts` — `t(lang, key, ...args)` lookup against the
   dictionary, matching the mock's function-value pattern for
   pluralized/interpolated strings (e.g. `dueCount: (n) => ...`).
4. A server action `setLanguage(lang)` that sets the cookie and the page
   re-renders server-side in the new language — no client translation swap
   needed at all.
5. `dir="rtl"` / `dir="ltr"` set on `<html>` from the same cookie read in
   `layout.tsx`, alongside the existing theme blocking script (same
   before-hydration approach, but this one can read a cookie server-side
   directly, so no flash-of-wrong-language risk the way theme has a
   flash-of-wrong-theme risk).
6. Font: mock switches to `Frank Ruhl Libre` for `dir="rtl"` — port that
   font-family swap.

## Phase 3 — Settings panel

New `src/components/Settings.tsx` (client component, dialog pattern like the
existing `Modal.tsx`, opened by the gear icon already sitting unwired in the
header). Sections (mock lines ~531–591):

1. **Appearance** — the theme toggle, repeated here *and* kept as its own
   header button (confirmed: matches the mock, which has it in both places).
2. **Language** — English / עברית buttons, calling `setLanguage`.
3. **Degree** — `degreeName` text input + `creditsRequired` number input,
   saved via a new action from Phase 1.
4. **Account** — avatar initial, name/email, **Log out** button (reuses the
   existing `logout` action from `src/app/actions/auth.ts` — no change
   needed there).

## Phase 4 — Navigation restructure (3-tab IA)

The mock's logged-in header is tabs (`This week` / `Degree` / `Semesters`) +
a breadcrumb trail for semester/course pages, all in one persistent header —
not the current "← All semesters" back-link pattern per page.

1. `/` becomes **This week** (Phase 5). The current semesters-list page moves
   from `/` to `/semesters`.
2. Add `/degree` (Phase 6).
3. Update `src/app/layout.tsx` header: render the 3 tabs with active-state
   underline (mock: `tabStyle`, `aria-current="page"` semantics), matching
   `v.tabs` logic — the "Semesters" tab stays visually active while on
   `/semesters`, `/semesters/[id]`, or `/courses/[id]`.
4. Add the breadcrumb trail (`v.crumbs`) to the header itself, replacing the
   per-page "← All semesters" / "← {semester name}" links in
   `src/app/semesters/[id]/page.tsx` and `src/app/courses/[id]/page.tsx`.
5. **Audit every hardcoded `href="/"` / `redirect("/")`** across the app —
   they currently mean "semesters home" and now need to mean either "This
   week" (the new `/`) or `/semesters` depending on intent. Known call
   sites: `src/app/login/page.tsx`, `src/app/signup/page.tsx` (both
   `redirect("/")` after already-logged-in check), `src/app/layout.tsx` nav
   brand link, `src/components/UserMenu.tsx` (none currently, just sign-out).

## Phase 5 — "This week" page (new `/`)

Scoping rules, read directly from the mock (lines ~1318–1362):

- **Week window** = the current ISO week, Monday through Sunday (not a
  rolling 7 days from today).
- **"Due this week" list**: homework across **every semester and course**
  (not just the active one) where `!completed && dueDate <= weekEnd` — this
  includes anything overdue from any point in the past, plus anything due by
  this Sunday. Sorted soonest/most-overdue first.
- **"Lectures this week" list**: scoped to **only the active semester**
  (today between start/end) — lectures with `scheduledDate` inside
  [weekStart, weekEnd]. If there's no active semester, show the empty state
  ("No semester in progress").
- Headline text is dynamic: if any overdue items exist, lead with the
  overdue count; otherwise the total due-this-week count; otherwise "Nothing
  due this week."

New file: `src/app/page.tsx` (replacing the current semesters-list content,
which moves to `src/app/semesters/page.tsx`). Needs a Prisma query across all
of the user's semesters/courses (homework) plus one scoped query for the
active semester's lectures.

## Phase 6 — "Degree" page (new `/degree`)

Exact formulas from the mock (`courseStats`, lines ~937–960):

- **Credits total** = sum of `credits` across every course, graded or not.
- **Credits earned** = sum of `credits` for courses where `examScore >= 60`
  (the pass threshold is hardcoded at 60 in the mock — confirm this is the
  right threshold for a real transcript, or make it configurable).
- **GPA/average** = credits-weighted mean of `examScore`, but **only across
  graded courses with `credits > 0`** — ungraded courses and zero-credit
  courses are excluded entirely from the average (not treated as 0).
- **Credits required** = `User.creditsRequired` if set, else default **120**.
- Per-semester breakdown: same `courseStats` computation scoped to that
  semester's courses, shown as a list sortable by semester.
- **Graded courses list**: search box filters across name/code/semester; with
  no search query, shows only graded courses sorted by grade descending; with
  a query, shows every matching course (graded or not) sorted alphabetically.
- Grade display styling: green/accent tag if `>= 60`, red/accent-2 tag if
  `< 60`, neutral/dash if ungraded (mock: `gradeStyle`).

New file: `src/app/degree/page.tsx`. Needs `examScore` from Phase 1 and
`degreeName`/`creditsRequired` from Phase 1 + Settings (Phase 3).

## Phase 7 — Pace indicator + semester status grouping (existing pages)

Both computable once `Lecture.scheduledDate` exists (Phase 1) — no further
schema needed.

**Pace bar** (semester detail page, mock lines ~1444–1469), shown **only for
the active semester** (today between start/end) **and only if it has at
least one lecture**:
- `due` = count of lectures across the semester's courses with
  `scheduledDate <= today`.
- `diff` = `watched - due`. Positive = ahead, negative = behind, zero = "on
  pace."
- `elapsed%` = `(today - start) / (end - start)`, clamped to [0, 1] — shown
  as a separate label, not used in the `diff` math itself.
- Track shows a fill bar (watched/total) plus a distinct tick mark at the
  `due/total` position, so you can see actual-vs-expected progress at a
  glance.

**Semester status grouping** (semesters list page, mock lines ~1415–1441):
group semesters into three sections instead of one flat grid:
- **In progress**: `start <= today <= end`.
- **Planned**: `start > today`.
- **Completed**: `end < today`.
- Sort: "In progress"/"Planned" ascending by start date, "Completed"
  descending by start date (most recent first).
- Always show the "In progress" section header even if empty; hide
  "Planned"/"Completed" sections entirely if they have zero semesters.

## Phase 8 — RTL audit

Once Hebrew/RTL is wired (Phase 2), every existing page needs a pass for
physical (non-mirroring) CSS that logical properties or explicit `[dir="rtl"]`
overrides are needed for:

- Any hardcoded `←`/`→` characters (currently used for "back" links on
  `src/app/semesters/[id]/page.tsx` and `src/app/courses/[id]/page.tsx`) need
  to flip direction under RTL, or be replaced with an SVG chevron
  transformed via `[dir="rtl"] { transform: scaleX(-1) }`.
- Any remaining `marginLeft`/`marginRight`/`textAlign: "left"` (physical)
  should become `marginInlineStart`/`marginInlineEnd`/`textAlign: "start"`
  (logical) so they flip automatically. Most of the current inline styles
  already use `gap` (direction-agnostic) or were ported from the mock's own
  logical-property CSS, but this needs a deliberate grep-and-check pass, not
  an assumption.
- Flexbox `flex-direction: row` mirrors automatically under `dir="rtl"` — no
  action needed there, just don't fight it with an explicit `row-reverse`.

## Phase 9 — Translate existing ported pages

Every page/component from the first reskin currently has hardcoded English
strings that need to route through `t()` from Phase 2:

`src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`,
`src/components/AuthForm.tsx`, `src/app/semesters/page.tsx` (moved from
`page.tsx`), `src/app/semesters/[id]/page.tsx`, `src/app/courses/[id]/page.tsx`,
`src/components/LectureRow.tsx`, `src/components/HomeworkItem.tsx`,
`src/components/DeleteButton.tsx` (confirm-dialog messages),
`src/components/forms/CourseForm.tsx`, `SemesterForm.tsx`, `HomeworkForm.tsx`
(labels/placeholders), `src/components/ThemeToggle.tsx` (aria-labels).

Since these are Server Components, most just need `const lang = await
getLang()` at the top and `t(lang, 'key')` in place of literal strings.
Client components (`AuthForm`, `ThemeToggle`, form modals) need the resolved
strings passed down as props from their server-component parents, since they
can't read the cookie directly without a client-safe wrapper.

## Phase 10 — Testing & verification checklist

Broader than the last pass — this phase changes data model, routing, and
adds a second language, so:

**Static checks**: `typecheck`, `lint`, `build` — same as before.

**Migration check**: run the new migration against a copy of the real data
(or at least confirm existing rows get `NULL` for all four new columns
without error) before it touches production.

**Functional — English**:
- Every existing CRUD flow from the last test pass (semester/course/lecture/
  homework create-edit-toggle-delete) still works after the `/` → `/semesters`
  move — check no broken links, no 404s on old bookmarks/redirects.
- This Week: verify against at least one real semester with homework due
  this week and overdue homework from a past date — confirm sorting and the
  overdue-count headline.
- Degree: verify GPA math by hand against 2–3 courses with known grades and
  credits; verify search filters correctly; verify ungraded/zero-credit
  courses are excluded from the average but zero-credit graded courses still
  show in the graded list correctly.
- Settings: degree name/credits save and immediately reflect on the Degree
  page; log out still works.
- Pace: set lecture `scheduledDate`s via "Schedule weekly," verify the
  ahead/behind/on-pace math against hand-calculated expectations.
- Semester grouping: verify a past, current, and future semester land in the
  right section.

**Functional — Hebrew**:
- Full click-through of every page above in Hebrew, checking: text is
  translated (not falling back to English anywhere), layout is RTL (nav
  order, alignment, back-arrows), no overlapping/clipped text from
  longer/shorter Hebrew strings, forms are still submittable (dates, numbers
  — these don't need translation but must still work with RTL layout around
  them).
- Reload while in Hebrew — confirm the server renders Hebrew immediately (no
  flash of English), proving the cookie-based approach actually avoids the
  hydration-mismatch problem it was chosen to avoid.

**Security re-verification** (repeat from the last pass): CSP/headers
unchanged, rate limiting still works, blob/PDF auth unaffected, login
error-state pattern intact. New surface to check specifically: the
`setLanguage` and degree-settings server actions don't accidentally bypass
`requireUser()`/session checks the way every other mutating action does.

## Phase 11 — Deploy

Same process as last time: push to `main`, expect Vercel to auto-deploy
(or need a manual Promote if the Microfrontends check misfires again), then
repeat the live-site smoke test — this time in both languages.
