// Vercel sets VERCEL_ENV to "production", "preview", or "development".
// Migrations must only run against the production database on production
// builds — a preview build (e.g. from an in-progress branch) shares the
// same DATABASE_URL as production in this single-database setup, so
// running `prisma migrate deploy` there would apply an unreviewed branch's
// schema changes to the live database.
const { execSync } = require("node:child_process");

if (process.env.VERCEL_ENV === "production") {
  console.log("VERCEL_ENV=production — running prisma migrate deploy.");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(
    `Skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`
  );
}
