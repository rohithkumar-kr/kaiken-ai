import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAtsAnalysis } from "@/lib/analysis-service";

const analyzeAtsSchema = z.object({
  jobDescriptionId: z.string().min(1, "A job description is required"),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUserPromise = currentUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = analyzeAtsSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const clerkUser = await clerkUserPromise;
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`;

  try {
    const { analysisId } = await createAtsAnalysis({
      clerkId: userId,
      email,
      jobDescriptionId: parsed.data.jobDescriptionId,
    });
    return NextResponse.json({ analysisId }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while running the analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
