# UI Overhaul Plan — "Broadsheet" Design Import

Source: Claude Design project **"Course Tracker UI"** (`3930fb27-c24c-4798-bd03-245b24e9161b`), file
`Course Tracker.dc.html`, design system **Broadsheet** (`_ds/broadsheet-982715b7-371b-4914-a411-45ed36b147d5/`).

This is a plan only — no app code has been changed yet. Follow it top to bottom, committing after
each numbered step, and run the test pass in Step 9 before calling it done.

## 0. What the new design actually is

- **Look**: newsprint/editorial. Near-black **Source Serif 4** on a paper-white ground, two spot
  accents (cyan `#0088b0`, magenta `#d6006c`), no boxes/dividers for layout — hierarchy comes from
  type scale and whitespace. One boxed component (`.card`) reserved for course/semester tiles.
- **Theming**: full light/dark via `body[data-theme="dark"]` attribute (not
  `prefers-color-scheme`) — the mock has an explicit theme-toggle button in the header/login. Our
  app currently has **no** theme toggle and no dark tokens in `globals.css` — this is new
  functionality, not a reskin.
- **Tokens**: one stylesheet, `styles.css`, defines everything as CSS custom properties
  (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`) plus a component class layer
  (`.btn`, `.field`/`.input`, `.card`, `.tag`, `.nav`, `.table`, `.dialog`, `.radio`, `.seg`). Our
  app currently styles everything with Tailwind utility strings in
  [ui.ts](src/components/ui.ts) and inline in components — that whole layer gets replaced.
- **Icons**: inline Phosphor SVGs (duotone), no icon library dependency needed.
- **Font loading**: Google Fonts `Source Serif 4` (and `Frank Ruhl Libre` for `dir="rtl"`, which we
  don't need — this app isn't RTL) via `@import`/`<link>` to `fonts.googleapis.com`.
- **Pages covered by the mock**: logged-out (login), a "week"/dashboard view, a "degree" (GPA/
  credits overview) view, semesters list, single semester view, single course view. Our app has:
  login, signup, semesters list ([src/app/page.tsx](src/app/page.tsx)), semester view
  ([src/app/semesters/[id]/page.tsx](src/app/semesters/[id]/page.tsx)), course view
  ([src/app/courses/[id]/page.tsx](src/app/courses/[id]/page.tsx)). **Signup, "week", and "degree"
  views don't exist in the mock 1:1** — signup isn't shown at all, week/degree are dashboard
  concepts our app doesn't have. Treat those as "apply the same visual language," not pixel ports.
  The decorative CMYK-plate print treatments (`.cmyk`, `.cmyk-num`, `print-plates.js`) are shown in
  the design system's showcase pages, not used in the actual app mock — **skip them**, they're not
  part of this app's UI.

## 1. Non-negotiable constraints (read before touching anything)

1. **Every server action's `formData.get("...")` name must survive unchanged.** Confirmed field
   names in use today:
   - `auth.ts`: `email`, `password`, `name`, `inviteCode`
   - `semesters.ts`: `name`, `startDate`, `endDate`, `id`
   - `courses.ts`: `semesterId`, `name`, `totalLectures`, `credits`, `color`, `id`
   - `lectures.ts`: `id`, `title`, `file`
   - `homework.ts`: `courseId`, `name`, `details`, `dueDate`, `answerText`, `id`, `which`
   Port presentation only. If a design mock doesn't show a field (e.g. `color`), keep the existing
   input and just restyle it — don't drop it.
2. **Keep the `useActionState`/`{error}` pattern** in [ActionForm.tsx](src/components/ActionForm.tsx)
   and [AuthForm.tsx](src/components/AuthForm.tsx) exactly as is — this was a deliberate fix for
   Next.js redacting thrown errors in production (see [SESSION_SUMMARY.md](SESSION_SUMMARY.md)).
   Restyle the error message's container, don't change how it's populated.
3. **Don't touch the CSP, session, rate-limit, or blob-auth code** in this pass except where the
   new design *requires* a CSP change (see Step 5 — adding a Google Fonts origin). Any such change
   must be additive (widen `style-src`/`font-src` to the specific Google Fonts hosts) — never loosen
   `script-src` or drop `nosniff`/frame-options.
4. **Self-host the font instead of trusting the mock's `<link>` if reasonably easy.** Loading
   `fonts.googleapis.com` at runtime means either (a) adding those two hosts to CSP `style-src`/
   `font-src`, or (b) using `next/font/google` (Next.js downloads and self-hosts at build time —
   no CSP change, no runtime request to Google, faster and more private). **Prefer (b).**
5. **No new dependencies needed** — no icon package, no CSS framework swap required beyond what's
   already there (Tailwind can stay installed even if unused by new components, or be removed in a
   later cleanup pass — not part of this overhaul).

## 2. Branch and checkpoint strategy

```bash
git checkout -b ui-overhaul-broadsheet
```

Commit after each step below (2 through 8) so any regression can be bisected/reverted without
losing the whole overhaul. Do not push until Step 9 passes.

## 3. Port the design tokens

- Add every `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*` variable from the
  design system's `styles.css` `:root` block into [src/app/globals.css](src/app/globals.css),
  replacing the current `--background`/`--foreground` pair.
- Add the dark-theme override block, keyed off `[data-theme="dark"]` on `<body>` (copy the values
  from the `.dc.html` mock's inline `<style>` block — it has a fuller dark palette than the design
  system file alone) — **not** `@media (prefers-color-scheme: dark)`, since the mock's toggle is a
  manual, persisted user choice, not an OS setting.
- Port the component class layer (`.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-icon`/
  `.btn-block`, `.field`/`.input`, `.card`/`.card-kicker`/`.card-title`/`.card-body`/`.card-meta`,
  `.elev-sm/md/lg`, `.tag*`, `.nav*`, `.table`, `.dialog*`, `.radio`, `.seg*`, `.hr`) into
  `globals.css` verbatim (they're plain CSS, framework-agnostic).
- Leave Tailwind's `@import "tailwindcss"` in place for now — removing it is a separate cleanup,
  not required for this visual port.

## 4. Add the theme toggle (new functionality)

- Decide storage: `localStorage` + a `data-theme` attribute set on `<html>` or `<body>` before
  first paint (an inline blocking script in [layout.tsx](src/app/layout.tsx), same technique most
  dark-mode implementations use, to avoid a flash of the wrong theme).
- Add a small client component (e.g. `src/components/ThemeToggle.tsx`) exposing the toggle button
  markup from the mock (the sun/moon SVG + label), wired to flip `data-theme` and persist the
  choice. This is new code, not a port — the mock only shows the finished UI, not the JS behind it.

## 5. Fonts

- Replace the Google Fonts `<link>`/`@import` with `next/font/google`:
  ```ts
  import { Source_Serif_4 } from "next/font/google";
  const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-heading-loaded" });
  ```
  applied via the `<html>`/`<body>` className in `layout.tsx`, then point `--font-heading`/
  `--font-body` at the loaded variable. Confirms no CSP change is needed for fonts.
- Skip `Frank Ruhl Libre` / `dir="rtl"` handling — not used by this app.

## 6. Rebuild each page, preserving wiring

Work one page at a time, committing after each. For every page: keep the existing
`<form action={...}>` / server-action imports / `formData` field names from Step 1 untouched;
change only markup structure and class names.

1. **Login** ([src/app/login/page.tsx](src/app/login/page.tsx)) — port the two-column hero +
   credentials-card layout from the mock's `loggedOut` block. Keep `AuthForm`'s existing `email`/
   `password` inputs; restyle with `.field`/`.input`/`.btn-primary btn-block`.
2. **Signup** ([src/app/signup/page.tsx](src/app/signup/page.tsx)) — no direct mock equivalent;
   reuse the login layout's visual language (same hero treatment, same card) and keep the
   `email`/`password`/`name`/`inviteCode` fields as-is.
3. **Semesters list** ([src/app/page.tsx](src/app/page.tsx)) — port the `isSemesters` block: grouped
   semester cards with the progress ring SVG, add-semester dashed card, edit/delete icon buttons.
   Preserve the existing `DeleteButton`/edit-modal wiring — the mock's `s.edit`/`s.remove`
   correspond to your existing edit/delete actions, just restyle the buttons as `.btn-icon`.
4. **Semester view** ([src/app/semesters/[id]/page.tsx](src/app/semesters/[id]/page.tsx)) — port the
   `isSemester` block: header stats row, course grid of `.card` tiles with the lecture-progress
   bar and homework dots, add-course dashed card. Keep `SemesterForm`/`CourseForm` modals'
   field names untouched.
5. **Course view** ([src/app/courses/[id]/page.tsx](src/app/courses/[id]/page.tsx)) — port the
   `isCourse` block: exam/grade summary, lecture list with the checkbox-toggle/PDF/attach/edit/
   delete row actions, homework list below. This page has the most server actions wired in
   (`LectureRow`, `HomeworkItem`, `CourseForm`) — go slowest here, verify each row action's markup
   maps to the same button/form after restyling.

Modals ([Modal.tsx](src/components/Modal.tsx), [CourseForm.tsx](src/components/forms/CourseForm.tsx),
[SemesterForm.tsx](src/components/forms/SemesterForm.tsx),
[HomeworkForm.tsx](src/components/forms/HomeworkForm.tsx)) aren't in the mock (it doesn't show
dialogs open) — restyle using the design system's `.dialog-backdrop`/`.dialog`/`.dialog-title`/
`.dialog-body`/`.dialog-actions` classes, keeping the existing form fields/names inside.

## 7. Retire the old style constants

Once all 5 pages + modals are ported and visually verified, delete the now-unused exports in
[ui.ts](src/components/ui.ts) (`inputClass`, `labelClass`, `btnPrimary`, `btnSecondary`,
`btnDanger`, `cardClass`) and grep for stragglers:

```bash
grep -rn "inputClass\|labelClass\|btnPrimary\|btnSecondary\|btnDanger\|cardClass" src/
```

Fix any component still importing them before deleting.

## 8. Accessibility parity check

The mock already encodes these — don't lose them in the port:
- `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` on every
  interactive element (buttons, inputs) — never rely on the browser default ring.
- `aria-pressed`/`aria-label` on toggle buttons (lecture-watched checkbox, homework-done checkbox).
- `aria-label` on icon-only buttons (edit/delete/settings).
- Keyboard activation (`onKeyDown`) on `role="button"` div-cards (semester/course cards) —
  in React this is simplest as real `<button>`/`<a>` elements instead of `div[role=button]`,
  which gets you keyboard support for free and is a legitimate deviation from the mock's markup.

## 9. Comprehensive test pass (do this before merging/deploying)

Run **all** of these — this is a full-app visual rewrite touching every page, so a partial check
isn't enough.

### Build & static checks
```bash
npm run typecheck
npm run lint
npm run build
```
All three must pass clean. `next build` also re-confirms the CSP/font change didn't break
production hydration the way the earlier CSP regression did (see SESSION_SUMMARY.md) — this is the
same failure mode this app hit once before.

### Local production smoke test
```bash
npm run build && npm run start
```
Open the built app (not `next dev` — dev mode hides some CSP/hydration issues) and manually:
1. **Login page**: loads styled, theme toggle flips light/dark and persists on reload, submitting
   wrong credentials shows the inline error (not a generic Next.js error page — this regressed once
   before), correct credentials logs in.
2. **Signup page**: same error-state check; wrong invite code shows inline error; correct invite
   code + new email creates an account and logs in.
3. **Semesters list**: existing semesters render as cards with correct progress rings; add/edit/
   delete a semester and confirm the DB actually changes (check via a second reload, not just
   optimistic UI); dashed "add semester" card works.
4. **Semester view**: course cards render with correct lecture/homework progress; add/edit/delete a
   course; confirm `totalLectures`, `credits`, `color` all save correctly (these are the fields
   most likely to get silently dropped in a markup port).
5. **Course view**: toggle a lecture watched/unwatched and confirm persistence; upload a PDF to a
   lecture and confirm it opens (this exercises the blob-auth path fixed in the security audit —
   make sure the restyled "open PDF" button still points at the same authenticated route); add/
   edit/delete a lecture and a homework item; toggle homework done; edit homework `answerText` and
   `dueDate`.
6. **Cross-cutting**: resize to mobile width and confirm no horizontal scroll/broken layout; check
   both light and dark theme on every page above, not just login.

### Security re-verification
The security audit from the last session must still hold after this visual rewrite:
- Check response headers (`curl -I` against the running build) still include CSP, `X-Content-Type-Options: nosniff`, frame-options — a font/CSP tweak in Step 5 is the only change allowed here, and only if you didn't use `next/font` after all.
- Confirm the CSP still allows Next.js's inline hydration script (this exact thing broke the whole
  app once already this project — retest it, don't assume).
- Re-check rate limiting: attempt several rapid failed logins and confirm the DB-backed rate limit
  still kicks in (the login form's restyle must not have changed the action wiring that rate-limit
  depends on).
- Re-check the blob file route: try requesting another user's lecture PDF by guessing/altering the
  URL and confirm it's still rejected (this is the exact vuln that was fixed — a markup-only pass
  shouldn't touch `src/lib/blob.ts` or the API route, but verify nothing in the port accidentally
  changed how the "open PDF" link is constructed).
- Confirm login/signup timing is still constant-time-ish (no dramatic difference between valid and
  invalid email) — spot check is enough here, not a full re-measurement, since this pass doesn't
  touch `auth.ts` logic.

### Sign-off
Only merge/deploy once every item above passes. If anything in the security re-verification list
fails, stop and fix it before proceeding — don't ship a visual improvement that reopens an already-
fixed vulnerability.

## 10. Deploy

Follow the existing Vercel workflow noted in SESSION_SUMMARY.md: push, expect the deployment to
possibly land in "Checks Failed" due to the known Microfrontends-check bug, use Force Promote/
Promote from the deployment menu if so. Re-run the login/signup smoke test against the live URL
after promoting (env vars are already set from last session, no new ones needed for this change).
