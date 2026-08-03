-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "overallScore" INTEGER,
ADD COLUMN     "reportGeneratedAt" TIMESTAMP(3);
