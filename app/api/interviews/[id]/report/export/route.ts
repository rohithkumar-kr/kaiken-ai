import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getInterviewReport } from "@/lib/interview-service";
import {
  buildInterviewReportMarkdown,
  buildInterviewReportPdf,
} from "@/lib/interview-report-export";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "interview-report"
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

  const report = await getInterviewReport(localUser.id, id);
  if (!report) {
    return NextResponse.json({ error: "Interview report not found" }, { status: 404 });
  }

  const baseName = slugify(`${report.jobRole} ${report.company ?? ""}`.trim());

  try {
    if (format === "md" || format === "markdown") {
      const content = buildInterviewReportMarkdown(report);
      return new Response(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.md"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildInterviewReportPdf(report);
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
    console.error("[api/interviews/report/export] Failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
