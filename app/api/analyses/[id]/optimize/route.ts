import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createOptimizedResume } from "@/lib/optimize-service";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

const OPTIMIZE_ERRORS = {
  429: {
    title: "AI service temporarily unavailable",
    description: "Please wait a moment before trying again.",
  },
  503: {
    title: "Our AI service is busy right now",
    description:
      "We're experiencing higher than usual demand. Please try again shortly.",
  },
  500: {
    title: "Couldn't optimize your resume",
    description:
      "Something went wrong while optimizing your resume. Please try again in a few moments.",
  },
} as const;

function aiServiceStatus(error: unknown): 429 | 503 | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  return status === 429 || status === 503 ? status : null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  try {
    const { generatedResumeId } = await createOptimizedResume(localUser.id, id);
    return NextResponse.json({ generatedResumeId }, { status: 201 });
  } catch (error) {
    const status = aiServiceStatus(error) ?? 500;
    const { title, description } = OPTIMIZE_ERRORS[status];
    console.error("[optimize:POST] Failed", error);
    return NextResponse.json({ title, description }, { status });
  }
}
