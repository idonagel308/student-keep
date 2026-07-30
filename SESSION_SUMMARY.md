# Course Tracker — Session Summary (2026-07-30)

Read this at the start of tomorrow's session to pick up where we left off.

## What shipped today

**Full app build** (semesters → courses → lectures → homework), with auth added
along the way (login/signup, invite-code gated). Deployed and live at
**https://student-keep.vercel.app**.

**Comprehensive security audit + fixes** — all findings fixed, verified against
a real production build, committed, and pushed:
- Blob file authorization rewritten to check exact stored URLs (was: path-parsed, exploitable via traversal)
- Uploaded filenames sanitized before use as storage keys
- Login timing leak fixed (was 250x difference, empirically measured)
- DB-backed rate limiting on login/signup
- Security headers (CSP, nosniff, frame-options, etc.)
- Server-side PDF validation (magic bytes + size cap)
- `totalLectures` capped to prevent resource exhaustion
- Migrations no longer run on Vercel preview builds
- Session hardening: `__Host-` cookie prefix, tokenVersion for revocation, min secret length, constant-time invite-code comparison
- **Found and fixed a real regression along the way**: the CSP I added initially broke the whole app (blocked Next.js's inline hydration scripts) — caught via testing a real production build, fixed before it shipped
- **Found and fixed a real bug via the same testing**: Next.js redacts thrown error messages in production ("Incorrect email or password" → generic error). Converted all form actions to return `{error}` state via `useActionState` instead of throwing.

**Deployment troubleshooting** (Vercel):
- Vercel has a buggy "Microfrontends Config Present" required check that fails even though its own error message says it shouldn't apply to this project (confirmed: dashboard says "This project is not a microfrontend", no toggle exists). Workaround: **Force Promote** / **Promote** from the deployment's `...` menu bypasses it. This will likely keep happening on future pushes until Vercel fixes it on their end.
- Found and fixed: Vercel's **Framework Preset was set to "Other" instead of "Next.js"**, causing every route to 404 in production. Fixed in Settings → Build and Deployment. (Settings changes don't retroactively apply to already-built deployments — had to redeploy after fixing.)
- Found and fixed: `SESSION_SECRET`, `SIGNUP_INVITE_CODE`, and `BLOB_READ_WRITE_TOKEN` were never set in Vercel's environment variables (only the Neon DB vars were there, auto-linked). Without `SESSION_SECRET` specifically, no one could sign in at all. Added all three, redeployed, verified signup+login work on the live site.

**Current live invite code:** `p_ehS3aZa-6R` (from local `.env` / now also in Vercel env vars)

## Known accounts in the DB right now

- `ido@example.com` — real account
- `attacker@example.com` — looks like a leftover test account from earlier rate-limit testing, not yet confirmed as intentional or cleaned up. **Ask about this tomorrow.**

## Known quirks / things to remember

- Git remote: `https://github.com/idonagel308/student-keep.git`, branch `main`. No `gh` CLI installed locally — commits use `git -c user.name=... -c user.email=...` matching the existing repo author (`idonagel308 <idonagel@gmail.com>`) since no global git identity is configured on this machine.
- Local `.env` holds real secrets (DB, Blob, session secret, invite code) — gitignored correctly, never committed.
- After any future `git push`, the new deployment will likely land in "Checks Failed" / Staged and need a manual Promote — check Vercel deployments list.
- Form actions across the app now follow a `useActionState`-based pattern (`{error}` return values, not throws) for anything wired through `ActionForm` or `AuthForm` — keep this pattern for any new forms.

## Todo list for tomorrow

1. **Add admin page to track user count** — a `/admin` route gated to the owner's account, showing total user count and a list of users with signup dates.
2. **Import and implement Claude Design UI overhaul** — full visual redesign.
   - Use the `DesignSync` tool (claude_design MCP) to import:
     `https://claude.ai/design/p/3930fb27-c24c-4798-bd03-245b24e9161b?file=Course+Tracker.dc.html`
   - Primary file: `Course Tracker.dc.html`
   - Also read (imported dependencies): `_ds/broadsheet-982715b7-371b-4914-a411-45ed36b147d5/_ds_bundle.js`, `_ds/broadsheet-982715b7-371b-4914-a411-45ed36b147d5/styles.css`, `support.js`
   - Port the visual design into the existing Next.js app (`src/components/ui.ts`, `globals.css`, and the 5 pages: login, signup, semesters list, semester view, course page).
   - **Important constraint**: preserve every server action's form `name` attributes exactly — the mutations read `formData.get("name")` etc., and a renamed input breaks saving *silently* (no type error). Port presentation, not the wiring.

## Recommended next-session opening move

Read this file, then just say "continue" or point directly at task #2 (the design import) — everything needed to resume is above.
