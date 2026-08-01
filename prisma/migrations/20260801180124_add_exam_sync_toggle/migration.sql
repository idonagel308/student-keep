-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "google_exam_event_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sync_exams_to_calendar" BOOLEAN NOT NULL DEFAULT false;
