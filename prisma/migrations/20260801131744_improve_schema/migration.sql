/*
  Warnings:

  - You are about to drop the column `content` on the `GeneratedResume` table. All the data in the column will be lost.
  - You are about to drop the column `extractedText` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Resume` table. All the data in the column will be lost.
  - Added the required column `markdown` to the `GeneratedResume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "grammarScore" INTEGER,
ADD COLUMN     "processingTime" INTEGER,
ADD COLUMN     "weaknesses" JSONB;

-- AlterTable
ALTER TABLE "GeneratedResume" DROP COLUMN "content",
ADD COLUMN     "markdown" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "KeywordMatch" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "Resume" DROP COLUMN "extractedText",
DROP COLUMN "role",
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawText" TEXT,
ADD COLUMN     "targetRole" TEXT;

-- AlterTable
ALTER TABLE "Suggestion" ADD COLUMN     "accepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
