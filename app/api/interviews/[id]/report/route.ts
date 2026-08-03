import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateInterviewReport } from "@/lib/interview-service";
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

  const result = await generateInterviewReport(localUser.id, id);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }
  if (result.status === "not_ready") {
    return NextResponse.json(
      {
        report: null,
        error: "Evaluate at least one answer before generating your report.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ report: result.report });
}
