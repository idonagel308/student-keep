-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "lecture_end_time" TEXT,
ADD COLUMN     "lecture_start_time" TEXT;

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "end_time" TEXT,
ADD COLUMN     "start_time" TEXT;
