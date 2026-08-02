import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createCoverLetter } from "@/lib/cover-letter-service";
import { ensureUser } from "@/lib/resume-service";

const generateSchema = z.object({
  analysisId: z.string().min(1, "An analysis is required"),
});

const QUOTA_ERROR_CODE = "GEMINI_QUOTA_EXCEEDED";

function isGeminiQuotaError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 429 &&
    "message" in error &&
    String((error as { message?: unknown }).message).includes("RESOURCE_EXHAUSTED")
  );
}

function extractRetryDelaySeconds(error: unknown): number | null {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : "";
  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (retryDelayMatch) {
    return Math.ceil(parseFloat(retryDelayMatch[1]));
  }
  const retryInMatch = message.match(/Please retry in (\d+(?:\.\d+)?)s/);
  if (retryInMatch) {
    return Math.ceil(parseFloat(retryInMatch[1]));
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    console.log("[cover-letter:POST] stage=auth complete", userId ?? "null");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const clerkUser = await currentUser();
    const localUser = await ensureUser(
      userId,
      clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
    );
    console.log("[cover-letter:POST] stage=ensureUser complete", localUser.id);

    const { coverLetterId } = await createCoverLetter({
      userId: localUser.id,
      analysisId: parsed.data.analysisId,
    });
    console.log("[cover-letter:POST] stage=cover letter created", coverLetterId);
    return NextResponse.json({ coverLetterId }, { status: 201 });
  } catch (error) {
    console.error("[cover-letter:POST] FAILED", error);
    if (isGeminiQuotaError(error)) {
      return NextResponse.json(
        {
          error: "Gemini quota exceeded",
          code: QUOTA_ERROR_CODE,
          retryAfterSeconds: extractRetryDelaySeconds(error),
        },
        { status: 429 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating the cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
