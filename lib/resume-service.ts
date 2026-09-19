import "server-only";

import { extractStructuredResume, GEMINI_MODEL } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import {
  extractTextFromBuffer,
  type SupportedFileType,
} from "@/lib/parse/text";
import { utapi } from "@/lib/uploadthing-server";
import type { ParsedResumeData } from "@/lib/types/resume";

export type AnalyzeResumeInput = {
  userId: string;
  email: string;
  resumeId: string;
};

const MAX_RESUME_FILE_SIZE = 16 * 1024 * 1024;

const toSupportedFileType = (
  fileType: "PDF" | "DOCX" | "TXT" | "MD"
): SupportedFileType => {
  if (fileType === "PDF") {
    return "pdf";
  }

  if (fileType === "DOCX") {
    return "docx";
  }

  throw new Error("This resume file type is not supported for analysis.");
};

/**
 * Create (or touch) the local User row that mirrors the Clerk account.
 */
export async function ensureUser(
  clerkId: string,
  email: string,
  name?: string | null
) {
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

/**
 * Download an uploaded resume from UploadThing.
 *
 * UploadThing already enforces the upload limit, but this second
 * server-side check protects the application if an unexpected or
 * oversized object is ever referenced by a Resume record.
 */
async function downloadFileBuffer(fileKey: string): Promise<Buffer> {
  const { ufsUrl } = await utapi.generateSignedURL(fileKey);

  const response = await fetch(ufsUrl);

  if (!response.ok) {
    throw new Error("Failed to download the uploaded file");
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength) {
    const size = Number(contentLength);

    if (!Number.isFinite(size) || size > MAX_RESUME_FILE_SIZE) {
      throw new Error("Resume file exceeds the maximum allowed size");
    }
  }

  const bytes = await response.arrayBuffer();

  if (bytes.byteLength > MAX_RESUME_FILE_SIZE) {
    throw new Error("Resume file exceeds the maximum allowed size");
  }

  return Buffer.from(bytes);
}

/**
 * Persist the complete structured resume.
 *
 * This function intentionally receives a Prisma transaction client.
 * ParsedResume and all of its child records are written using the
 * same transaction as the parent Resume status update.
 */
async function saveParsedResume(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  resumeId: string,
  parsed: ParsedResumeData
): Promise<void> {
  const existing = await tx.parsedResume.findUnique({
    where: { resumeId },
  });

  if (existing) {
    await tx.parsedResume.delete({
      where: { id: existing.id },
    });
  }

  await tx.parsedResume.create({
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
 * Full upload → parse → AI → persist pipeline.
 *
 * 1. Resolves the owning User.
 * 2. Loads the already-created Resume and verifies ownership.
 * 3. Atomically claims the resume for processing.
 * 4. Downloads the file from UploadThing.
 * 5. Verifies the downloaded file size.
 * 6. Extracts text.
 * 7. Sends the text/PDF to Gemini for structured extraction.
 * 8. Atomically persists ParsedResume + child records and marks
 *    the Resume COMPLETED.
 * 9. Returns the parsed data.
 */
export async function analyzeResume(
  input: AnalyzeResumeInput
): Promise<{ resumeId: string; parsed: ParsedResumeData }> {
  const user = await ensureUser(input.userId, input.email);

  /*
   * The Resume was created by UploadThing's server-side callback.
   *
   * Only use the resumeId supplied by the authenticated user's client
   * after verifying that it belongs to the current user.
   */
  const resume = await prisma.resume.findFirst({
    where: {
      id: input.resumeId,
      userId: user.id,
    },
  });

  if (!resume) {
    throw new Error("Resume not found");
  }

  const fileType = toSupportedFileType(resume.fileType);

  /**
   * Atomically claim this resume for processing.
   *
   * updateMany() is intentional here:
   * two simultaneous requests can both read the same resume,
   * but only one can successfully change it to PROCESSING.
   *
   * The second request gets count === 0 and is rejected before
   * Gemini is called, preventing duplicate AI processing.
   */
  const claimed = await prisma.resume.updateMany({
    where: {
      id: resume.id,
      userId: user.id,
      parseStatus: {
        not: "PROCESSING",
      },
    },
    data: {
      parseStatus: "PROCESSING",
      parseError: null,
    },
  });

  if (claimed.count !== 1) {
    throw new Error("Resume analysis is already in progress");
  }

  /*
   * IMPORTANT:
   * fileKey comes from our trusted database row,
   * not from the client.
   */
  try {
    const buffer = await downloadFileBuffer(resume.fileKey);

    let rawText = "";

    try {
      rawText = await extractTextFromBuffer(buffer, fileType);
    } catch (error) {
      /*
       * PDFs can contain scanned/image-only content.
       *
       * If PDF text extraction fails, keep the original PDF so
       * Gemini can potentially process the document directly.
       */
      if (fileType !== "pdf") {
        throw error;
      }

      console.error(
        "[analyzeResume:extract] PDF text extraction failed; continuing with the original PDF.",
        error
      );
    }

    const pdfBuffer = fileType === "pdf" ? buffer : undefined;

    if (!rawText.trim() && !pdfBuffer) {
      throw new Error("No readable text was found in this file");
    }

    /*
     * Gemini processing happens OUTSIDE the DB transaction.
     *
     * This is important because an AI request can take seconds or
     * minutes. Holding a PostgreSQL transaction open during that
     * period would unnecessarily consume DB connections.
     */
    const parsed = await extractStructuredResume(
      rawText,
      pdfBuffer
    );

    /*
     * FINAL PERSISTENCE TRANSACTION
     *
     * These operations must succeed or fail together:
     *
     * - replace ParsedResume
     * - create all parsed child records
     * - save raw resume text
     * - mark Resume COMPLETED
     * - make this resume primary
     * - demote the user's previous primary resume
     *
     * This prevents a situation where Resume says COMPLETED but
     * ParsedResume was only partially saved.
     */
    await prisma.$transaction(async (tx) => {
      await saveParsedResume(tx, resume.id, parsed);

      await tx.resume.update({
        where: {
          id: resume.id,
          userId: user.id,
        },
        data: {
          rawText,
          parseStatus: "COMPLETED",
          parseError: null,
          isPrimary: true,
        },
      });

      /*
       * Only one resume should be the user's primary resume.
       *
       * This is performed in the same transaction as the current
       * resume update so the database does not observe a partially
       * updated state.
       */
      await tx.resume.updateMany({
        where: {
          userId: user.id,
          id: {
            not: resume.id,
          },
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    });

    return {
      resumeId: resume.id,
      parsed,
    };
  } catch (error) {
    console.error(
      "[analyzeResume:error]",
      new Date().toISOString(),
      error instanceof Error ? error.stack ?? error : error
    );

    /*
     * The main transaction above guarantees that COMPLETED is only
     * committed when ParsedResume persistence succeeds.
     *
     * If anything before or during that transaction fails, mark
     * the resume FAILED so the UI does not leave it permanently
     * stuck in PROCESSING.
     */
    await prisma.resume
      .update({
        where: {
          id: resume.id,
          userId: user.id,
        },
        data: {
          parseStatus: "FAILED",
          parseError:
            error instanceof Error
              ? error.message
              : "Unknown parse error",
        },
      })
      .catch((statusError) => {
        console.error(
          "[analyzeResume:error-status-update]",
          statusError
        );
      });

    throw error;
  }
}

/**
 * Latest parsed resume with its parsed content, for the dashboard.
 *
 * FAILED is intentionally included so the dashboard can surface
 * the latest failed processing attempt and its parseError.
 */
export async function getLatestParsedResume(userId: string) {
  return prisma.resume.findFirst({
    where: {
      userId,
      parseStatus: {
        in: ["COMPLETED", "FAILED"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      parsedResume: {
        include: {
          skills: {
            orderBy: {
              order: "asc",
            },
          },
          experiences: {
            orderBy: {
              order: "asc",
            },
          },
          projects: {
            orderBy: {
              order: "asc",
            },
          },
          educations: {
            orderBy: {
              order: "asc",
            },
          },
          certifications: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });
}

export type DashboardResume =
  Awaited<ReturnType<typeof getLatestParsedResume>>;

/**
 * Permanently deletes a user's resume and its associated database data.
 *
 * The database cascade removes dependent records such as:
 * - ParsedResume
 * - Skills
 * - Experience
 * - Projects
 * - Education
 * - Certifications
 * - Analyses
 * - Generated resumes
 * - Related dependent records
 *
 * The actual uploaded file is deleted from UploadThing separately.
 */
export async function deleteResume(
  userId: string,
  resumeId: string
): Promise<{ deleted: true }> {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
    select: {
      id: true,
      fileKey: true,
      parseStatus: true,
    },
  });

  if (!resume) {
    throw new Error("Resume not found");
  }

  if (resume.parseStatus === "PROCESSING") {
    throw new Error("Resume analysis is currently in progress");
  }

  /*
   * Delete the database record first.
   *
   * Resume relations use onDelete: Cascade, so dependent database
   * records are removed automatically by PostgreSQL.
   */
  await prisma.resume.delete({
    where: {
      id: resume.id,
    },
  });

  /*
   * Delete the actual uploaded file from UploadThing after the
   * database deletion succeeds.
   *
   * If this fails, the database remains consistent and the error
   * is logged for later cleanup.
   */
  try {
    await utapi.deleteFiles(resume.fileKey);
  } catch (error) {
    console.error(
      "[deleteResume:uploadthing] Failed to delete uploaded file",
      {
        resumeId: resume.id,
        fileKey: resume.fileKey,
        error,
      }
    );
  }

  return { deleted: true };
}