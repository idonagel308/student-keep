-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "google_exam_sync_hash" TEXT;

-- AlterTable
ALTER TABLE "homework" ADD COLUMN     "google_sync_hash" TEXT;

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "google_sync_hash" TEXT;
