-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "exam_score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "lectures" ADD COLUMN     "scheduled_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credits_required" DOUBLE PRECISION,
ADD COLUMN     "degree_name" TEXT;
