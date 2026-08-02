import "server-only";

import { optimizeResumeForJob } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { buildOptimizedMarkdown } from "@/lib/optimized-export";
import { toParsedResumeData } from "@/lib/parsed-resume";
import type { AtsOutput } from "@/lib/types/analysis";
import type { OptimizedResumeData } from "@/lib/types/optimize";

type PrismaJson = OptimizedResumeData;

type AnalysisWithDetails = NonNullable<
  Awaited<ReturnType<typeof findAnalysisWithDetails>>
>;

async function findAnalysisWithDetails(userId: string, analysisId: string) {
  return prisma.analysis.findFirst({
    where: { id: analysisId, userId },
    include: {
      resume: {
        include: {
          parsedResume: {
            include: {
              skills: { orderBy: { order: "asc" } },
              experiences: { orderBy: { order: "asc" } },
              projects: { orderBy: { order: "asc" } },
              educations: { orderBy: { order: "asc" } },
              certifications: { orderBy: { order: "asc" } },
            },
          },
        },
      },
      jobDescription: true,
      keywords: true,
      suggestions: true,
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
 * Run the resume optimizer for a completed analysis owned by the user: sends the
 * parsed resume, job description and ATS report to Gemini, then persists the
 * optimized resume into the GeneratedResume table.
 */
export async function createOptimizedResume(
  userId: string,
  analysisId: string
): Promise<{ generatedResumeId: string }> {
  const analysis = await findAnalysisWithDetails(userId, analysisId);
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
  const optimized = await optimizeResumeForJob(
    resumeData,
    {
      title: analysis.jobDescription.title,
      company: analysis.jobDescription.company,
      content: analysis.jobDescription.content,
    },
    toAtsOutput(analysis)
  );

  const markdown = buildOptimizedMarkdown(
    {
      name: analysis.resume.parsedResume.name,
      email: analysis.resume.parsedResume.email,
      phone: analysis.resume.parsedResume.phone,
    },
    optimized
  );

  const generated = await prisma.generatedResume.create({
    data: {
      userId,
      sourceResumeId: analysis.resumeId,
      analysisId: analysis.id,
      jobDescriptionId: analysis.jobDescriptionId,
      format: "MARKDOWN",
      status: "COMPLETED",
      markdown,
      data: optimized as unknown as PrismaJson,
    },
  });

  return { generatedResumeId: generated.id };
}

export type OptimizedResumeRow = NonNullable<
  Awaited<ReturnType<typeof findGeneratedResume>>
>;

async function findGeneratedResume(userId: string, id: string) {
  return prisma.generatedResume.findFirst({
    where: { id, userId },
    include: {
      analysis: { select: { id: true, atsScore: true, analyzedAt: true } },
      jobDescription: { select: { title: true, company: true } },
      sourceResume: {
        include: {
          parsedResume: {
            include: {
              skills: { orderBy: { order: "asc" } },
              experiences: { orderBy: { order: "asc" } },
              projects: { orderBy: { order: "asc" } },
              educations: { orderBy: { order: "asc" } },
              certifications: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });
}

/** A generated (optimized) resume owned by a user, with its source resume. */
export function getOptimizedResume(userId: string, id: string) {
  return findGeneratedResume(userId, id);
}
