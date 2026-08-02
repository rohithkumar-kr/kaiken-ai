import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createOptimizedResume } from "@/lib/optimize-service";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

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
    const message =
      error instanceof Error ? error.message : "Failed to optimize the resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
