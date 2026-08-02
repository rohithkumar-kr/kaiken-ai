import "server-only";

import { extractStructuredResume, GEMINI_MODEL } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { extractTextFromBuffer, type SupportedFileType } from "@/lib/parse/text";
import { utapi } from "@/lib/uploadthing-server";
import type { ParsedResumeData } from "@/lib/types/resume";

export type AnalyzeResumeInput = {
  userId: string;
  email: string;
  fileKey: string;
  fileName: string;
  fileType: SupportedFileType;
  fileSize?: number;
  resumeId?: string;
};

const toFileTypeEnum = (fileType: SupportedFileType): "PDF" | "DOCX" =>
  fileType === "pdf" ? "PDF" : "DOCX";

/** Create (or touch) the local User row that mirrors the Clerk account. */
export async function ensureUser(clerkId: string, email: string, name?: string | null) {
  return prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      ...(name ? { name } : {}),
      lastLoginAt: new Date(),
    },
    create: {
      clerkId,
      email,
      ...(name ? { name } : {}),
      lastLoginAt: new Date(),
    },
  });
}

async function downloadFileBuffer(fileKey: string): Promise<Buffer> {
  const { ufsUrl } = await utapi.generateSignedURL(fileKey);
  const response = await fetch(ufsUrl);
  if (!response.ok) {
    throw new Error("Failed to download the uploaded file");
  }
  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

async function saveParsedResume(resumeId: string, parsed: ParsedResumeData): Promise<void> {
  const existing = await prisma.parsedResume.findUnique({
    where: { resumeId },
    include: { skills: true },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.skill.deleteMany({ where: { parsedResumeId: existing.id } }),
      prisma.experience.deleteMany({ where: { parsedResumeId: existing.id } }),
      prisma.project.deleteMany({ where: { parsedResumeId: existing.id } }),
      prisma.education.deleteMany({ where: { parsedResumeId: existing.id } }),
      prisma.certification.deleteMany({
        where: { parsedResumeId: existing.id },
      }),
      prisma.parsedResume.delete({ where: { id: existing.id } }),
    ]);
  }

  await prisma.parsedResume.create({
    data: {
      resumeId,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      summary: parsed.summary,
      modelVersion: GEMINI_MODEL,
      skills: {
        create: parsed.skills.map((skill, index) => ({
          name: skill,
          order: index,
        })),
      },
      experiences: {
        create: parsed.experience.map((item, index) => ({
          title: item.title,
          company: item.company,
          location: item.location,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
          order: index,
        })),
      },
      projects: {
        create: parsed.projects.map((item, index) => ({
          name: item.name,
          description: item.description,
          technologies: item.technologies,
          url: item.url,
          startDate: item.startDate,
          endDate: item.endDate,
          order: index,
        })),
      },
      educations: {
        create: parsed.education.map((item, index) => ({
          institution: item.institution,
          degree: item.degree,
          fieldOfStudy: item.fieldOfStudy,
          startDate: item.startDate,
          endDate: item.endDate,
          grade: item.grade,
          order: index,
        })),
      },
      certifications: {
        create: parsed.certifications.map((item, index) => ({
          name: item.name,
          issuer: item.issuer,
          date: item.date,
          url: item.url,
          order: index,
        })),
      },
    },
  });
}

/**
 * Full upload→parse→AI→persist pipeline.
 *
 * 1. Resolves/creates the owning User.
 * 2. Creates a `Resume` row (or reuses one for retries).
 * 3. Downloads the file from UploadThing and extracts text.
 * 4. Sends the text to Gemini for structured extraction.
 * 5. Persists everything in PostgreSQL and returns the parsed data.
 */
export async function analyzeResume(
  input: AnalyzeResumeInput
): Promise<{ resumeId: string; parsed: ParsedResumeData }> {
  // [TEMP-DEBUG] stage logging — remove after diagnosing
  const logStage = (stage: string, ...args: unknown[]) =>
    console.log(`[analyzeResume:${stage}]`, new Date().toISOString(), ...args);

  logStage("1-user", { userId: input.userId, email: input.email, resumeId: input.resumeId ?? null });

  const user = await ensureUser(input.userId, input.email);
  logStage("1-user", "done", { id: user.id, email: user.email });

  const existing = input.resumeId
    ? await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: user.id },
      })
    : null;
  if (input.resumeId && !existing) {
    throw new Error("Resume not found");
  }

  const resume =
    existing ??
    (await prisma.resume.create({
      data: {
        userId: user.id,
        title: input.fileName,
        fileName: input.fileName,
        fileKey: input.fileKey,
        fileUrl: `https://utfs.io/f/${input.fileKey}`,
        fileType: toFileTypeEnum(input.fileType),
        fileSize: input.fileSize ?? 0,
        parseStatus: "PROCESSING",
      },
    }));
  logStage("1-user", "resume", { resumeId: resume.id, existing: !!existing });

  try {
    logStage("2-download", { fileKey: input.fileKey });
    const buffer = await downloadFileBuffer(input.fileKey);
    logStage("2-download", "done", { bytes: buffer.byteLength });

    logStage("3-extract", { fileType: input.fileType });
    const rawText = await extractTextFromBuffer(buffer, input.fileType);
    logStage("3-extract", "done", { chars: rawText.length, preview: rawText.slice(0, 200) });

    if (!rawText.trim()) {
      throw new Error("No readable text was found in this file");
    }

    logStage("4-gemini-request", { chars: rawText.length });
    const parsed = await extractStructuredResume(rawText);

    logStage("5-gemini-response", {
      name: parsed.name,
      skills: parsed.skills.length,
      experience: parsed.experience.length,
      projects: parsed.projects.length,
      education: parsed.education.length,
      certifications: parsed.certifications.length,
    });

    logStage("6-prisma-save", { resumeId: resume.id, mode: existing ? "update" : "create" });
    await prisma.$transaction([
      prisma.resume.update({
        where: { id: resume.id },
        data: {
          title: input.fileName,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl: `https://utfs.io/f/${input.fileKey}`,
          fileType: toFileTypeEnum(input.fileType),
          fileSize: input.fileSize ?? resume.fileSize,
          rawText,
          parseStatus: "COMPLETED",
          parseError: null,
          isPrimary: true,
        },
      }),
      prisma.resume.updateMany({
        where: { userId: user.id, id: { not: resume.id }, isPrimary: true },
        data: { isPrimary: false },
      }),
    ]);

    await saveParsedResume(resume.id, parsed);
    logStage("6-prisma-save", "done", { resumeId: resume.id });

    return { resumeId: resume.id, parsed };
  } catch (error) {
    console.error(
      "[analyzeResume:error]",
      new Date().toISOString(),
      error instanceof Error ? error.stack ?? error : error
    );
    await prisma.resume
      .update({
        where: { id: resume.id },
        data: {
          parseStatus: "FAILED",
          parseError: error instanceof Error ? error.message : "Unknown parse error",
        },
      })
      .catch(() => undefined);
    throw error;
  }
}

/** Latest primary resume with its parsed content, for the dashboard. */
export async function getLatestParsedResume(userId: string) {
  return prisma.resume.findFirst({
    where: { userId, parseStatus: { in: ["COMPLETED", "FAILED"] } },
    orderBy: { updatedAt: "desc" },
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
  });
}

export type DashboardResume = Awaited<ReturnType<typeof getLatestParsedResume>>;
