import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { evaluateInterviewAnswer } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";
import { checkAiRateLimit } from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
    questionId: string;
  }>;
};

const EVALUATION_ERRORS = {
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
    title: "Couldn't evaluate your answer",
    description:
      "Something went wrong while evaluating your answer. Please try again in a few moments.",
  },
} as const;

function aiServiceStatus(error: unknown): 429 | 503 | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return null;
  }

  const status = (error as { status?: unknown }).status;

  return status === 429 || status === 503 ? status : null;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  const [{ userId }, { id, questionId }] = await Promise.all([
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

    const result = await evaluateInterviewAnswer(
      localUser.id,
      id,
      questionId
    );

    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Interview question not found" },
        { status: 404 }
      );
    }

    if (result.status === "empty") {
      return NextResponse.json(
        {
          error:
            "Write your answer before requesting feedback.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      evaluation: result.evaluation,
    });
  } catch (error) {
    console.error(
      "[api/interviews/evaluate] Failed:",
      error
    );

    const status = aiServiceStatus(error);

    if (status !== null) {
      const { title, description } =
        EVALUATION_ERRORS[status];

      return NextResponse.json(
        { title, description },
        { status }
      );
    }

    return apiErrorResponse(error, {
      fallbackMessage:
        "Something went wrong while evaluating your answer. Please try again in a few moments.",
    });
  }
}