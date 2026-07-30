/* eslint-disable @typescript-eslint/no-require-imports -- CJS script run directly via `node`, matches scripts/migrate-if-production.js */
// One-time copy of every existing Vercel Blob object into the R2 bucket,
// under the exact same storage key. Nothing in the database changes — every
// Lecture.summaryFileUrl / Homework.assignmentFileUrl / answerFileUrl value
// already stores "/api/files/<key>", and both backends are read through
// that same key (see src/lib/blob.ts), so once every key that exists in
// Blob also exists in R2, flipping the R2_* env vars is the entire cutover.
//
// This script only COPIES. It never deletes the source Vercel Blob store —
// do that manually, afterward, once you've verified the app reads
// correctly with R2_* set.
//
// Usage (run from the project root, with BOTH the existing
// BLOB_READ_WRITE_TOKEN and the new R2_* vars present in .env):
//   node scripts/migrate-blob-to-r2.js
//   node scripts/migrate-blob-to-r2.js --dry-run

require("dotenv").config();
const { list, get } = require("@vercel/blob");
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  requireEnv("BLOB_READ_WRITE_TOKEN");
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log("Listing existing Vercel Blob objects...");
  let cursor;
  let total = 0;
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  do {
    const page = await list({ cursor, limit: 1000 });
    for (const item of page.blobs) {
      total++;
      const key = item.pathname;

      let alreadyExists = false;
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        alreadyExists = true;
      } catch {
        alreadyExists = false;
      }

      if (alreadyExists) {
        console.log(`SKIP  (already in R2) ${key}`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`WOULD COPY ${key} (${item.size} bytes)`);
        copied++;
        continue;
      }

      try {
        // Blobs are uploaded with access: "private" (see src/lib/blob.ts),
        // so a plain fetch(item.url) gets a 403 — get() authenticates with
        // BLOB_READ_WRITE_TOKEN the same way the app's download route does.
        const downloaded = await get(key, { access: "private" });
        if (!downloaded) throw new Error("blob not found via get()");
        const body = Buffer.from(await new Response(downloaded.stream).arrayBuffer());

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: item.contentType ?? "application/pdf",
          })
        );
        console.log(`COPIED ${key} (${body.length} bytes)`);
        copied++;
      } catch (err) {
        console.error(`FAILED ${key}:`, err.message);
        failed++;
      }
    }
    cursor = page.cursor;
  } while (cursor);

  console.log("");
  console.log(`Total in Blob: ${total}`);
  console.log(`Copied:        ${copied}`);
  console.log(`Already in R2: ${skipped}`);
  console.log(`Failed:        ${failed}`);

  if (failed > 0) {
    console.error(
      "\nSome files failed to copy — do not delete the Vercel Blob store or flip R2_* env vars in production until this is re-run clean."
    );
    process.exit(1);
  }
  if (DRY_RUN) {
    console.log("\nDry run only — nothing was written to R2.");
  } else {
    console.log(
      "\nAll files copied. Verify by setting R2_* env vars locally and re-downloading a few files through the app before flipping production, then delete the Vercel Blob store manually."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
