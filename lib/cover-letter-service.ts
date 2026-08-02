import "server-only";

import { GEMINI_MODEL, generateCoverLetter } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { toParsedResumeData } from "@/lib/parsed-resume";
import type { AtsOutput } from "@/lib/types/analysis";
import type { CoverLetterItem } from "@/lib/types/cover-letter";
import type { OptimizedResumeData } from "@/lib/types/optimize";

export type CreateCoverLetterInput = {
  userId: string;
  analysisId: string;
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

type AnalysisWithDetails = NonNullable<
  Awaited<ReturnType<typeof findAnalysisWithDetails>>
>;

async function findAnalysisWithDetails(userId: string, analysisId: string) {
  return prisma.analysis.findFirst({
    where: { id: analysisId, userId },
    include: {
      resume: { include: parsedResumeInclude },
      jobDescription: { select: { title: true, company: true, content: true } },
      keywords: true,
      suggestions: true,
      generatedResumes: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, data: true },
      },
    },
  });
}

function toAtsOutput(analysis: AnalysisWithDetails): AtsOutput {
  return {
    atsScore: analysis.atsScore ?? 0,
    formatScore: analysis.formatScore ?? 0,
    keywordScore: analysis.keywordScore ?? 0,
    contentScore: analysis.contentScore ?? 0,
    summary: analysis.summary,
    matchedKeywords: analysis.keywords
      .filter((keyword) => keyword.category === "PRESENT")
      .map((keyword) => ({
        keyword: keyword.keyword,
        importance: keyword.importance,
        count: keyword.count,
        section: keyword.section,
      })),
    missingKeywords: analysis.keywords
      .filter((keyword) => keyword.category === "MISSING")
      .map((keyword) => ({
        keyword: keyword.keyword,
        importance: keyword.importance,
      })),
    strengths: (analysis.strengths as unknown as string[] | null) ?? [],
    weaknesses: (analysis.weaknesses as unknown as string[] | null) ?? [],
    suggestions: analysis.suggestions.map((suggestion) => ({
      type: suggestion.type,
      section: suggestion.section,
      severity: suggestion.severity,
      title: suggestion.title,
      description: suggestion.description,
      aiRewrite: suggestion.aiRewrite,
    })),
  };
}

/**
 * Generate a cover letter for a completed analysis owned by the user, using the
 * parsed resume, the latest optimized resume (if one exists), the job
 * description and the ATS analysis. Persists the result and returns its id.
 */
export async function createCoverLetter(
  input: CreateCoverLetterInput
): Promise<{ coverLetterId: string }> {
  const analysis = await findAnalysisWithDetails(input.userId, input.analysisId);
  console.log("[cover-letter-service] stage=analysis loaded", {
    analysisId: input.analysisId,
    found: !!analysis,
    status: analysis?.status,
    hasParsedResume: !!analysis?.resume?.parsedResume,
    hasJobDescription: !!analysis?.jobDescription,
  });
  if (!analysis) {
    throw new Error("Analysis not found.");
  }
  if (!analysis.resume.parsedResume) {
    throw new Error("No parsed resume found for this analysis.");
  }
  if (!analysis.jobDescription) {
    throw new Error("This analysis has no linked job description.");
  }
  if (analysis.status !== "COMPLETED") {
    throw new Error("The analysis is not complete yet.");
  }

  const resumeData = toParsedResumeData(analysis.resume.parsedResume);
  console.log("[cover-letter-service] stage=parsed resume loaded");
  const latestGenerated = analysis.generatedResumes[0];
  let optimizedData: OptimizedResumeData | undefined;
  if (latestGenerated?.data) {
    const candidate = latestGenerated.data as unknown as OptimizedResumeData;
    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray(candidate.experience) &&
      Array.isArray(candidate.skills)
    ) {
      optimizedData = candidate;
    }
  }
  console.log("[cover-letter-service] stage=optimized resume loaded", {
    hasOptimized: !!optimizedData,
  });

  console.log("[cover-letter-service] stage=Gemini request starting");
  const content = await generateCoverLetter({
    resume: resumeData,
    optimized: optimizedData,
    job: {
      title: analysis.jobDescription.title,
      company: analysis.jobDescription.company,
      content: analysis.jobDescription.content,
    },
    analysis: toAtsOutput(analysis),
  });
  console.log("[cover-letter-service] stage=Gemini response received", {
    contentLength: content.length,
  });

  console.log("[cover-letter-service] stage=database save starting");
  let coverLetter;
  try {
    coverLetter = await prisma.coverLetter.create({
      data: {
        userId: input.userId,
        analysisId: analysis.id,
        generatedResumeId: latestGenerated?.id ?? null,
        content,
        status: "COMPLETED",
        modelVersion: GEMINI_MODEL,
      },
    });
  } catch (error) {
    const prismaError = error as {
      code?: unknown;
      meta?: unknown;
      message?: string;
    };
    console.error("[cover-letter-service] Prisma create failed", {
      code: prismaError.code ?? null,
      meta: prismaError.meta ?? null,
      message: prismaError.message ?? null,
    });
    throw error;
  }
  console.log("[cover-letter-service] stage=database save complete", {
    coverLetterId: coverLetter.id,
  });

  return { coverLetterId: coverLetter.id };
}

/** A single cover letter owned by a user, with the analysis context. */
export async function getCoverLetter(userId: string, id: string) {
  return prisma.coverLetter.findFirst({
    where: { id, userId },
    include: {
      analysis: {
        include: {
          resume: {
            select: {
              fileName: true,
              parsedResume: { select: { name: true, email: true, phone: true } },
            },
          },
          jobDescription: { select: { title: true, company: true } },
        },
      },
    },
  });
}

export type CoverLetterRow = NonNullable<Awaited<ReturnType<typeof getCoverLetter>>>;

function toCoverLetterItem(row: CoverLetterRow): CoverLetterItem {
  return {
    id: row.id,
    analysisId: row.analysisId,
    generatedResumeId: row.generatedResumeId,
    content: row.content,
    status: row.status,
    error: row.error,
    modelVersion: row.modelVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resumeName: row.analysis?.resume?.fileName ?? null,
    jobTitle: row.analysis?.jobDescription?.title ?? null,
    jobCompany: row.analysis?.jobDescription?.company ?? null,
    candidateName: row.analysis?.resume?.parsedResume?.name ?? null,
    candidateEmail: row.analysis?.resume?.parsedResume?.email ?? null,
    candidatePhone: row.analysis?.resume?.parsedResume?.phone ?? null,
  };
}

/** All cover letters owned by a user, newest first, for the history page. */
export async function listCoverLetters(userId: string): Promise<CoverLetterItem[]> {
  const rows = await prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      analysis: {
        include: {
          resume: {
            select: { fileName: true, parsedResume: { select: { name: true } } },
          },
          jobDescription: { select: { title: true, company: true } },
        },
      },
    },
  });

  return rows.map(toCoverLetterItem);
}

/**
 * Update the content of a cover letter owned by a user. Returns `false` when
 * the user does not own a cover letter with the given id (404).
 */
export async function updateCoverLetterContent(
  userId: string,
  id: string,
  content: string
): Promise<boolean> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Cover letter content cannot be empty.");
  }

  const result = await prisma.coverLetter.updateMany({
    where: { id, userId },
    data: { content: trimmed, status: "COMPLETED" },
  });
  return result.count > 0;
}

/**
 * Delete a cover letter owned by a user. Returns `false` when the user does not
 * own a cover letter with the given id (404).
 */
export async function deleteCoverLetter(userId: string, id: string): Promise<boolean> {
  const result = await prisma.coverLetter.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
