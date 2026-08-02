import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { deleteInterviewSession, updateInterviewSession } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";
import { interviewSessionInputSchema } from "@/lib/types/interview";

type RouteContext = { params: Promise<{ id: string }> };

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

  const parsed = interviewSessionInputSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const interviewSession = await updateInterviewSession(localUser.id, id, parsed.data);
  if (!interviewSession) {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }

  return NextResponse.json({ interviewSession });
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

  const deleted = await deleteInterviewSession(localUser.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
