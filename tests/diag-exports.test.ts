import { config } from "dotenv";
config();

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/uploadthing-server", () => ({ utapi: {} }));

import { prisma } from "@/lib/db";
import { getAnalysis } from "@/lib/analysis-service";
import { getOptimizedResume } from "@/lib/optimize-service";
import { getCoverLetter } from "@/lib/cover-letter-service";
import { toReportView } from "@/lib/report-view";
import { buildMarkdownReport, buildPdfReport } from "@/lib/report-export";
import { buildOptimizedMarkdown, buildOptimizedPdf } from "@/lib/optimized-export";
import {
  buildCoverLetterMarkdown,
  buildCoverLetterPdf,
} from "@/lib/cover-letter-export";
import { toParsedResumeData } from "@/lib/parsed-resume";
import { optimizedResumeSchema } from "@/lib/types/optimize";

describe("export pipelines against real data", () => {
  it("builds ATS report markdown + PDF", async () => {
    const analysis = await prisma.analysis.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
    });
    expect(analysis).toBeTruthy();
    const full = await getAnalysis(analysis!.userId, analysis!.id);
    expect(full).toBeTruthy();
    const view = toReportView(full!);
    const md = buildMarkdownReport(view);
    expect(md.length).toBeGreaterThan(100);
    expect(md).toContain("ATS Analysis");
    const pdf = await buildPdfReport(view);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    console.log(`ATS MD ${md.length} bytes, PDF ${pdf.length} bytes`);
  });

  it("builds optimized resume markdown + PDF", async () => {
    const g = await prisma.generatedResume.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
    });
    expect(g).toBeTruthy();
    const row = await getOptimizedResume(g!.userId, g!.id);
    expect(row).toBeTruthy();
    const parsed = optimizedResumeSchema.safeParse(row!.data);
    expect(parsed.success).toBe(true);
    const contact = {
      name: row!.sourceResume.parsedResume?.name ?? null,
      email: row!.sourceResume.parsedResume?.email ?? null,
      phone: row!.sourceResume.parsedResume?.phone ?? null,
    };
    const md = buildOptimizedMarkdown(contact, parsed.data!);
    expect(md.length).toBeGreaterThan(50);
    const pdf = await buildOptimizedPdf(contact, parsed.data!);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    console.log(`Opt MD ${md.length} bytes, PDF ${pdf.length} bytes`);
  });

  it("builds cover letter markdown + PDF", async () => {
    const cl = await prisma.coverLetter.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
    });
    expect(cl).toBeTruthy();
    const row = await getCoverLetter(cl!.userId, cl!.id);
    expect(row).toBeTruthy();
    const data = {
      candidateName: row!.analysis?.resume?.parsedResume?.name ?? null,
      candidateEmail: row!.analysis?.resume?.parsedResume?.email ?? null,
      candidatePhone: row!.analysis?.resume?.parsedResume?.phone ?? null,
      jobTitle: row!.analysis?.jobDescription?.title ?? null,
      jobCompany: row!.analysis?.jobDescription?.company ?? null,
      content: row!.content,
      generatedAt: row!.createdAt,
    };
    const md = buildCoverLetterMarkdown(data);
    expect(md.length).toBeGreaterThan(50);
    const pdf = await buildCoverLetterPdf(data);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    console.log(`CL MD ${md.length} bytes, PDF ${pdf.length} bytes`);
  });

  it("parses all stored parsed resumes", async () => {
    const res = await prisma.resume.findMany({
      where: { parseStatus: "COMPLETED", parsedResume: { isNot: null } },
      include: {
        parsedResume: {
          include: {
            skills: true,
            experiences: true,
            projects: true,
            educations: true,
            certifications: true,
          },
        },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) {
      const data = toParsedResumeData(r.parsedResume!);
      expect(Array.isArray(data.skills)).toBe(true);
    }
    console.log(`Parsed ${res.length} resumes OK`);
  });
});
