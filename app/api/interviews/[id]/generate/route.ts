import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateInterviewQuestions } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const [{ userId }, { id }] = await Promise.all([auth(), context.params]);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  let questions;
  try {
    questions = await generateInterviewQuestions(localUser.id, id);
  } catch (error) {
    console.error("[api/interviews/generate] Failed to generate questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions. Please try again." },
      { status: 500 }
    );
  }

  if (!questions) {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }

  return NextResponse.json({ questions });
}
