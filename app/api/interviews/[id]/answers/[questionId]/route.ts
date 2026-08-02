import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { upsertInterviewAnswer } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";
import { interviewAnswerInputSchema } from "@/lib/types/interview";

type RouteContext = { params: Promise<{ id: string; questionId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const [{ userId }, { id, questionId }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = interviewAnswerInputSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const answer = await upsertInterviewAnswer(localUser.id, id, questionId, parsed.data);
  if (!answer) {
    return NextResponse.json({ error: "Interview question not found" }, { status: 404 });
  }

  return NextResponse.json({ answer });
}
