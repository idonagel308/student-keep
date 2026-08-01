# How to build: first-time-login onboarding sequence

Goal: show new users a short walkthrough the first time they land on the app
after signing up, and never show it again — on any device, any future login.

## 1. Add a persistent flag to the User model

Edit [prisma/schema.prisma](prisma/schema.prisma), inside `model User`:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  tokenVersion Int      @default(0) @map("token_version")
  createdAt    DateTime @default(now()) @map("created_at")

  degreeName      String? @map("degree_name")
  creditsRequired Float?  @map("credits_required")

  /// True once the user has finished or skipped the first-run onboarding
  /// walkthrough. Persisted so it never reappears on a later login or
  /// a different device.
  hasCompletedOnboarding Boolean @default(true) @map("has_completed_onboarding")

  semesters Semester[]

  @@map("users")
}
```

Use `@default(true)` (not `false`) so the migration doesn't retroactively
show the tour to every existing user — only new signups should get `false`.
That happens in the next step.

Run the migration:

```bash
npx prisma migrate dev --name add_onboarding_flag
```

## 2. Default new signups to `false`

Find wherever `prisma.user.create` runs for signup (likely
`src/app/actions/*` or an auth action tied to `/signup`). Add the field
explicitly:

```ts
await prisma.user.create({
  data: {
    email,
    passwordHash,
    hasCompletedOnboarding: false, // show the walkthrough on first login
    // ...other fields
  },
});
```

## 3. Expose the flag through the DAL

Edit [src/lib/dal.ts](src/lib/dal.ts) — add `hasCompletedOnboarding: true` to
the `select` block in `getCurrentUser` (around line 24), same pattern as the
existing `degreeName`/`creditsRequired` fields. This is the single
authorization-checked source of truth the rest of the app should read from —
don't fetch this separately elsewhere.

## 4. Server action to mark it complete

New file `src/app/actions/onboarding.ts`, following the pattern in
[src/app/actions/settings.ts](src/app/actions/settings.ts):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";

export async function completeOnboarding() {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { hasCompletedOnboarding: true },
  });

  revalidatePath("/", "layout");
}
```

Call this both when the user finishes the last step AND when they click
"Skip" — either path should permanently dismiss it.

## 5. The walkthrough component

Client component, e.g. `src/components/Onboarding.tsx`:

- Renders a modal with a few steps (arrows/dots to move next/back).
- On "Finish" or "Skip", calls `completeOnboarding()` (a server action, so
  call it via `useTransition`/`startTransition` or wire it to a `<form
  action={completeOnboarding}>` the same way other action forms in this repo
  work — check `src/components/ActionForm.tsx` for the existing pattern).
- Keep copy short: 3-4 slides max (e.g. "Add a semester" → "Add courses" →
  "Track lectures & homework" → "Check your degree progress").

Render it conditionally from the root layout or the main page:

```tsx
// src/app/page.tsx (or layout.tsx)
const user = await requireUser();
// ...
{!user.hasCompletedOnboarding && <Onboarding />}
```

## 6. Why this won't misfire for existing users

- The flag lives in the database on the `User` row, not in `localStorage` or
  component state — so it's identical across every device/browser the user
  logs in from.
- Existing users get `hasCompletedOnboarding = true` from the migration
  default, so they never see it retroactively.
- Only rows created after step 2 start as `false`.
- Once set to `true` (on finish or skip), it never flips back — no "half
  finished" state to worry about, since either action marks it done
  immediately.

## 7. Testing checklist

- [ ] Sign up a new account → onboarding modal appears.
- [ ] Click through to the end → modal closes, flag is `true` in DB.
- [ ] Log out, log back in → modal does NOT reappear.
- [ ] Click "Skip" on a fresh account → same result as finishing.
- [ ] Existing (pre-migration) account → never sees the modal.
- [ ] i18n: add any new copy strings to
      [src/lib/i18n/dictionary.ts](src/lib/i18n/dictionary.ts) for both
      `en` and `he`, matching how other UI strings are localized.
