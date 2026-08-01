-- AlterTable
ALTER TABLE "homework" ADD COLUMN     "google_task_id" TEXT;

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "google_event_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_access_token" TEXT,
ADD COLUMN     "google_access_token_expiry" TIMESTAMP(3),
ADD COLUMN     "google_refresh_token" TEXT,
ADD COLUMN     "sync_homework_to_tasks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sync_lectures_to_calendar" BOOLEAN NOT NULL DEFAULT false;
