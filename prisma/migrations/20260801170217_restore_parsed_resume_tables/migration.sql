-- CreateTable
CREATE TABLE "ParsedResume" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "summary" TEXT,
    "modelVersion" TEXT,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "parsedResumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "parsedResumeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "parsedResumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "technologies" JSONB,
    "url" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "parsedResumeId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "grade" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "parsedResumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "date" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParsedResume_resumeId_key" ON "ParsedResume"("resumeId");

-- CreateIndex
CREATE INDEX "ParsedResume_resumeId_idx" ON "ParsedResume"("resumeId");

-- CreateIndex
CREATE INDEX "Skill_parsedResumeId_idx" ON "Skill"("parsedResumeId");

-- CreateIndex
CREATE INDEX "Experience_parsedResumeId_idx" ON "Experience"("parsedResumeId");

-- CreateIndex
CREATE INDEX "Project_parsedResumeId_idx" ON "Project"("parsedResumeId");

-- CreateIndex
CREATE INDEX "Education_parsedResumeId_idx" ON "Education"("parsedResumeId");

-- CreateIndex
CREATE INDEX "Certification_parsedResumeId_idx" ON "Certification"("parsedResumeId");

-- AddForeignKey
ALTER TABLE "ParsedResume" ADD CONSTRAINT "ParsedResume_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "ParsedResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "ParsedResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "ParsedResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "ParsedResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "ParsedResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
