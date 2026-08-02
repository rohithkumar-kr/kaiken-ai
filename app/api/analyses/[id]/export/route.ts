import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getAnalysis } from "@/lib/analysis-service";
import { buildMarkdownReport, buildPdfReport } from "@/lib/report-export";
import { toReportView } from "@/lib/report-view";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ats-analysis"
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

  const analysis = await getAnalysis(localUser.id, id);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const view = toReportView(analysis);
  const baseName = slugify(view.jobTitle ?? view.resumeName ?? "ats-analysis");

  try {
    if (format === "md" || format === "markdown") {
      const content = buildMarkdownReport(view);
      return new Response(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.md"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildPdfReport(view);
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
