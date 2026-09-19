import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { generateInterviewQuestions } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";
import { checkAiRateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  const [{ userId }, { id }] = await Promise.all([
    auth(),
    context.params,
  ]);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
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
            Math.max(
              1,
              Math.ceil(
                (rateLimit.reset - Date.now()) / 1000
              )
            )
          ),
        },
      }
    );
  }

  try {
    const clerkUser = await currentUser();

    const localUser = await ensureUser(
      userId,
      clerkUser?.primaryEmailAddress?.emailAddress ??
        `${userId}@kaiken.local`
    );

    const questions = await generateInterviewQuestions(
      localUser.id,
      id
    );

    if (!questions) {
      return NextResponse.json(
        { error: "Interview session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    return apiErrorResponse(error, {
      fallbackMessage:
        "Failed to generate interview questions. Please try again.",
    });
  }
}