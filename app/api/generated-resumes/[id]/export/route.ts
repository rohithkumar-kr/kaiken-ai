import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { buildOptimizedMarkdown, buildOptimizedPdf } from "@/lib/optimized-export";
import { getOptimizedResume } from "@/lib/optimize-service";
import { ensureUser } from "@/lib/resume-service";
import { optimizedResumeSchema } from "@/lib/types/optimize";

type RouteContext = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "optimized-resume"
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

  const generated = await getOptimizedResume(localUser.id, id);
  if (!generated) {
    return NextResponse.json({ error: "Optimized resume not found" }, { status: 404 });
  }

  const parsed = optimizedResumeSchema.safeParse(generated.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Optimized resume data is missing" }, { status: 404 });
  }

  const contact = {
    name: generated.sourceResume.parsedResume?.name ?? null,
    email: generated.sourceResume.parsedResume?.email ?? null,
    phone: generated.sourceResume.parsedResume?.phone ?? null,
  };
  const baseName = slugify(contact.name ?? "optimized-resume");

  try {
    if (format === "md" || format === "markdown") {
      const content = buildOptimizedMarkdown(contact, parsed.data);
      return new Response(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}-optimized.md"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await buildOptimizedPdf(contact, parsed.data);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}-optimized.pdf"`,
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
