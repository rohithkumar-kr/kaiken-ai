import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createAtsAnalysis } from "@/lib/analysis-service";
import { checkAiRateLimit } from "@/lib/rate-limit";

const analyzeAtsSchema = z.object({
  jobDescriptionId: z.string().min(1, "A job description is required"),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = analyzeAtsSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  const rateLimit = await checkAiRateLimit(userId);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many AI requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  const clerkUser = await currentUser();

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`;

  try {
    const { analysisId } = await createAtsAnalysis({
      clerkId: userId,
      email,
      jobDescriptionId: parsed.data.jobDescriptionId,
    });

    return NextResponse.json({ analysisId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, {
      fallbackMessage:
        "Something went wrong while running the ATS analysis. Please try again.",
    });
  }
}