# Migrating file storage from Vercel Blob to Cloudflare R2

This is a plan, not a change — nothing in the app is touched by this document.
It describes what actually needs to move if we decide to swap storage
providers later.

## Why this would be worth doing

Every PDF in this app (lecture summaries, homework assignment files, homework
answer files) goes through `uploadPdf()` in [src/lib/blob.ts](src/lib/blob.ts),
which is capped at 10MB per file. Vercel Blob's free tier is 1GB of storage
plus 10GB/month of transfer; Cloudflare R2's free tier is 10GB of storage
with no transfer/egress fee at all. For a storage bucket that's mostly PDFs
being read back occasionally (not written constantly), R2's model fits
better and gives more headroom before anyone has to think about a paid plan.

## Why this project's migration is much smaller than a generic guide

A generic "add file storage to Next.js" guide usually has you build a new
upload API route, a new client-side upload component, a new `NEXT_PUBLIC_*`
credential setup, and a new database table for files. None of that applies
here — this app already has all of that, just wired to Vercel Blob instead
of R2:

- **Uploads already happen inside server actions.** [lectures.ts:53](src/app/actions/lectures.ts:53)
  and [homework.ts:9-12](src/app/actions/homework.ts:9) call `uploadPdf(file, prefix)`
  directly — there's no client-side fetch to an API route to replace.
- **File metadata already lives on the right rows.** `Lecture.summaryFileUrl`
  and `Homework.assignmentFileUrl`/`answerFileUrl` in
  [schema.prisma](prisma/schema.prisma) already store the URL. No new table
  needed.
- **Downloads already go through an authorization check**, not a signed
  URL. [route.ts](src/app/api/files/%5B...path%5D/route.ts) calls
  `canReadBlobPath()` in [dal.ts:105](src/lib/dal.ts:105), which matches the
  *exact stored URL* against the requesting user's own lectures/homework
  before ever touching the blob store. This is the fix from the earlier
  security audit (an unguessable URL is not an authorization boundary) and
  needs to be preserved exactly, not replaced by a presigned-URL scheme that
  only checks "does this key exist," not "does this user own it."
- **Nothing needs to be public.** All storage access happens server-side, so
  R2 credentials stay as private env vars — no `NEXT_PUBLIC_*` variables are
  needed at all.

Because of that, the real migration touches exactly two files plus env vars,
and doesn't change the schema, the forms, or any page.

## What actually changes

**1. `src/lib/blob.ts`** — swap the `@vercel/blob` `put`/`del` calls for an
S3-compatible client (`@aws-sdk/client-s3`, since R2 speaks S3's API), while
keeping `uploadPdf(file, prefix)` and `deleteBlob(url)` with the exact same
signatures and return shape (`{ url: "/api/files/...", name }`). Every
caller in `lectures.ts` and `homework.ts` stays untouched.

**2. `src/app/api/files/[...path]/route.ts`** — swap the `@vercel/blob`
`get()` call for an S3 `GetObjectCommand`, streamed back the same way. The
`canReadBlobPath()` check stays exactly as-is, before and after — this route
is the piece that must not regress.

**3. Environment variables** — replace `BLOB_READ_WRITE_TOKEN` with:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

  (all private/server-only, added to `.env`, `.env.example`, and Vercel's
  project env vars — same places `BLOB_READ_WRITE_TOKEN` lives today)

**4. `package.json`** — remove `@vercel/blob`, add `@aws-sdk/client-s3`.

**5. One-time data migration** — since there's already a real account with
uploaded files, existing blobs need to be copied into the R2 bucket using
the same pathnames already stored in `summaryFileUrl` /
`assignmentFileUrl` / `answerFileUrl` (just stripping the `/api/files/`
prefix to get the storage key), so no rows in the database need to change.
A short one-off script: list existing blobs via `@vercel/blob`'s `list()`,
download each, re-upload to R2 under the same key, verify counts match, then
delete the Blob store.

## What this migration should *not* introduce

- No new API route for uploads (server actions already do this).
- No client-side upload component (forms already handle this).
- No `NEXT_PUBLIC_*` R2 variables (nothing client-side touches R2).
- No new `uploaded_files` table (the existing per-row URL columns are fine).
- No presigned-URL download scheme replacing `canReadBlobPath()` — ownership
  must still be checked server-side on every file request.

## Rough effort

Small. The bulk of the work is testing that uploads and the download
route still enforce ownership correctly after the client swap, plus running
and verifying the one-time copy of existing files — not writing new
features.
