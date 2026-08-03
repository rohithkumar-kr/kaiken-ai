-- AlterTable
ALTER TABLE "InterviewAnswer" ADD COLUMN     "evaluatedAt" TIMESTAMP(3),
ADD COLUMN     "evaluationModelVersion" TEXT,
ADD COLUMN     "evaluationScore" INTEGER,
ADD COLUMN     "idealAnswer" TEXT,
ADD COLUMN     "strengths" JSONB,
ADD COLUMN     "suggestions" JSONB,
ADD COLUMN     "weaknesses" JSONB;
