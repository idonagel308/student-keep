/*
  Warnings:

  - Added the required column `user_id` to the `semesters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "semesters_user_id_idx" ON "semesters"("user_id");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
