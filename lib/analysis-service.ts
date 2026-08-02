import "server-only";

import { analyzeResumeForJob, GEMINI_MODEL } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { ensureUser } from "@/lib/resume-service";
import type { ParsedResumeData } from "@/lib/types/resume";

export type AnalyzeAtsInput = {
  clerkId: string;
  email: string;
  jobDescriptionId: string;
};

const parsedResumeInclude = {
  parsedResume: {
    include: {
      skills: { orderBy: { order: "asc" } },
      experiences: { orderBy: { order: "asc" } },
      projects: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
    },
  },
} as const;

async function findLatestParsedResume(userId: string) {
  return prisma.resume.findFirst({
    where: { userId, parseStatus: "COMPLETED", parsedResume: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    include: parsedResumeInclude,
  });
}

type ParsedResumeRow = NonNullable<
  NonNullable<Awaited<ReturnType<typeof findLatestParsedResume>>>["parsedResume"]
>;

function toParsedResumeData(parsed: ParsedResumeRow): ParsedResumeData {
  return {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    summary: parsed.summary,
    skills: parsed.skills.map((skill) => skill.name),
    experience: parsed.experiences.map((item) => ({
      title: item.title,
      company: item.company,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate,
      description: item.description,
    })),
    projects: parsed.projects.map((item) => ({
      name: item.name,
      description: item.description,
      technologies: (item.technologies ?? []) as string[],
      url: item.url,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    education: parsed.educations.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate,
      endDate: item.endDate,
      grade: item.grade,
    })),
    certifications: parsed.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      url: item.url,
    })),
  };
}

/**
 * Run an ATS analysis of the user's latest parsed resume against a saved job
 * description, persist the results, and return the id of the new analysis.
 */
export async function createAtsAnalysis(
  input: AnalyzeAtsInput
): Promise<{ analysisId: string }> {
  const user = await ensureUser(input.clerkId, input.email);

  const [resume, jobDescription] = await Promise.all([
    findLatestParsedResume(user.id),
    prisma.jobDescription.findFirst({
      where: { id: input.jobDescriptionId, userId: user.id },
    }),
  ]);
  if (!resume?.parsedResume) {
    throw new Error("No parsed resume found. Upload and parse a resume first.");
  }
  if (!jobDescription) {
    throw new Error("Job description not found.");
  }

  const resumeData = toParsedResumeData(resume.parsedResume);

  const startedAt = Date.now();
  const result = await analyzeResumeForJob(resumeData, {
    title: jobDescription.title,
    company: jobDescription.company,
    content: jobDescription.content,
  });
  const processingTime = Date.now() - startedAt;

  const analysis = await prisma.analysis.create({
    data: {
      userId: user.id,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      inputSnapshot: {
        resume: resumeData,
        jobDescription: {
          title: jobDescription.title,
          company: jobDescription.company,
          content: jobDescription.content,
        },
      },
      status: "COMPLETED",
      atsScore: result.atsScore,
      formatScore: result.formatScore,
      keywordScore: result.keywordScore,
      contentScore: result.contentScore,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      modelVersion: GEMINI_MODEL,
      analyzedAt: new Date(),
      processingTime,
      keywords: {
        create: [
          ...result.matchedKeywords.map((keyword) => ({
            keyword: keyword.keyword,
            category: "PRESENT" as const,
            importance: keyword.importance,
            count: keyword.count,
            section: keyword.section,
          })),
          ...result.missingKeywords.map((keyword) => ({
            keyword: keyword.keyword,
            category: "MISSING" as const,
            importance: keyword.importance,
            count: 0,
            section: null,
          })),
        ],
      },
      suggestions: {
        create: result.suggestions.map((suggestion) => ({
          type: suggestion.type,
          section: suggestion.section,
          severity: suggestion.severity,
          title: suggestion.title,
          description: suggestion.description,
          aiRewrite: suggestion.aiRewrite,
        })),
      },
    },
  });

  return { analysisId: analysis.id };
}

/** A single analysis owned by a user, with its keywords and suggestions. */
export async function getAnalysis(userId: string, id: string) {
  return prisma.analysis.findFirst({
    where: { id, userId },
    include: {
      resume: { select: { fileName: true } },
      jobDescription: { select: { title: true, company: true } },
      keywords: { orderBy: [{ importance: "asc" }, { keyword: "asc" }] },
      suggestions: { orderBy: { severity: "asc" } },
    },
  });
}

export type AnalysisHistoryItem = {
  id: string;
  atsScore: number | null;
  resumeName: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  analyzedAt: string;
};

/** Completed analyses owned by a user, newest first, for the history page. */
export async function listAnalyses(userId: string): Promise<AnalysisHistoryItem[]> {
  const rows = await prisma.analysis.findMany({
    where: { userId, status: "COMPLETED", analyzedAt: { not: null } },
    orderBy: { analyzedAt: "desc" },
    select: {
      id: true,
      atsScore: true,
      analyzedAt: true,
      resume: { select: { fileName: true } },
      jobDescription: { select: { title: true, company: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    atsScore: row.atsScore,
    resumeName: row.resume.fileName,
    jobTitle: row.jobDescription?.title ?? null,
    jobCompany: row.jobDescription?.company ?? null,
    analyzedAt: (row.analyzedAt ?? new Date()).toISOString(),
  }));
}

/**
 * Delete an analysis owned by a user. Returns `false` when the user does not
 * own an analysis with the given id (404).
 */
export async function deleteAnalysis(userId: string, id: string): Promise<boolean> {
  const result = await prisma.analysis.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export type AnalysisReportData = NonNullable<Awaited<ReturnType<typeof getAnalysis>>>;
