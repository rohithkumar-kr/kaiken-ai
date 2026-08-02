import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCoverLetter,
  getCoverLetter,
  updateCoverLetterContent,
} from "@/lib/cover-letter-service";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  content: z.string().trim().min(1, "Cover letter content cannot be empty."),
});

function toCoverLetterResponse(row: NonNullable<Awaited<ReturnType<typeof getCoverLetter>>>) {
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

export async function GET(_request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const coverLetter = await getCoverLetter(localUser.id, id);
  if (!coverLetter) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }

  return NextResponse.json({ coverLetter: toCoverLetterResponse(coverLetter) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  try {
    const updated = await updateCoverLetterContent(localUser.id, id, parsed.data.content);
    if (!updated) {
      return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
    }

    const coverLetter = await getCoverLetter(localUser.id, id);
    return NextResponse.json({ coverLetter: coverLetter ? toCoverLetterResponse(coverLetter) : null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const deleted = await deleteCoverLetter(localUser.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
