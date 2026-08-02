import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  buildCoverLetterMarkdown,
  buildCoverLetterPdf,
  type CoverLetterExportData,
} from "@/lib/cover-letter-export";
import { getCoverLetter } from "@/lib/cover-letter-service";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "cover-letter"
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "pdf";

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const coverLetter = await getCoverLetter(localUser.id, id);
  if (!coverLetter) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }

  const data: CoverLetterExportData = {
    candidateName: coverLetter.analysis?.resume?.parsedResume?.name ?? null,
    candidateEmail: coverLetter.analysis?.resume?.parsedResume?.email ?? null,
    candidatePhone: coverLetter.analysis?.resume?.parsedResume?.phone ?? null,
    jobTitle: coverLetter.analysis?.jobDescription?.title ?? null,
    jobCompany: coverLetter.analysis?.jobDescription?.company ?? null,
    content: coverLetter.content,
    generatedAt: coverLetter.createdAt,
  };

  const baseName = slugify(
    `${data.candidateName ?? "cover-letter"}-${data.jobCompany ?? data.jobTitle ?? "letter"}`
  );

  try {
    if (format === "md" || format === "markdown") {
      const content = buildCoverLetterMarkdown(data);
      return new Response(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.md"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildCoverLetterPdf(data);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Content-Length": String(pdf.length),
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate the export";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
