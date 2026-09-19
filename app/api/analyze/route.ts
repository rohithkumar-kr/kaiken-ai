import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { analyzeResume } from "@/lib/resume-service";
import { checkAiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const analyzeSchema = z.object({
  resumeId: z
    .string()
    .trim()
    .min(1, "Resume ID is required")
    .max(128, "Invalid resume ID"),
});

function getRequestId(): string {
  return crypto.randomUUID();
}

function getRetryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId();

  /*
   * ------------------------------------------------------------
   * 1. Authentication
   * ------------------------------------------------------------
   */
  const { userId } = await auth();

  if (!userId) {
    console.warn(`[API/analyze] Unauthorized request ${requestId}`);

    return NextResponse.json(
      {
        error: "Unauthorized",
        requestId,
      },
      {
        status: 401,
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * 2. Parse and validate request body
   * ------------------------------------------------------------
   */
  let body: z.infer<typeof analyzeSchema>;

  try {
    const rawBody = await request.json();
    const parsed = analyzeSchema.safeParse(rawBody);

    if (!parsed.success) {
      console.warn(
        `[API/analyze] Invalid request ${requestId}:`,
        parsed.error.flatten()
      );

      return NextResponse.json(
        {
          error: "Invalid request. A valid resumeId is required.",
          requestId,
        },
        {
          status: 400,
        }
      );
    }

    body = parsed.data;
  } catch (error) {
    console.warn(
      `[API/analyze] Failed to parse request body ${requestId}:`,
      error
    );

    return NextResponse.json(
      {
        error: "Invalid request body.",
        requestId,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * 3. AI rate limiting
   * ------------------------------------------------------------
   */
  let rateLimit;

  try {
    rateLimit = await checkAiRateLimit(userId);
  } catch (error) {
    /*
     * Rate-limit infrastructure failure should not be silently
     * converted into a successful AI request.
     */
    console.error(
      `[API/analyze] Rate-limit check failed ${requestId}:`,
      error
    );

    return NextResponse.json(
      {
        error:
          "AI service is temporarily unavailable. Please try again shortly.",
        requestId,
      },
      {
        status: 503,
      }
    );
  }

  if (!rateLimit.success) {
    const retryAfter = getRetryAfterSeconds(rateLimit.reset);

    console.warn(
      `[API/analyze] Rate limit exceeded ${requestId}. Retry after ${retryAfter}s.`
    );

    return NextResponse.json(
      {
        error: "Too many AI requests. Please try again later.",
        retryAfter,
        requestId,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * 4. Resolve user email
   * ------------------------------------------------------------
   *
   * analyzeResume() is still responsible for the actual resume
   * ownership and database workflow.
   *
   * We keep the existing fallback because the Prisma user may
   * legitimately have an email unavailable from Clerk at this
   * exact moment.
   * ------------------------------------------------------------
   */
  let email = `${userId}@kaiken.local`;

  try {
    const clerkUser = await currentUser();

    email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      `${userId}@kaiken.local`;
  } catch (error) {
    /*
     * Do not fail the entire analysis simply because fetching the
     * optional Clerk profile information failed.
     *
     * analyzeResume() already receives the authenticated userId.
     */
    console.warn(
      `[API/analyze] Could not retrieve Clerk profile ${requestId}. Using fallback email.`
    );
  }

  /*
   * ------------------------------------------------------------
   * 5. Run resume analysis
   * ------------------------------------------------------------
   */
  console.log(
    `[API/analyze] Starting analysis ${requestId} for resume ${body.resumeId}`
  );

  const startedAt = Date.now();

  try {
    const result = await analyzeResume({
      userId,
      email,
      resumeId: body.resumeId,
    });

    const durationMs = Date.now() - startedAt;

    console.log(
      `[API/analyze] Analysis completed ${requestId} in ${durationMs}ms`
    );

    /*
     * Keep the original result intact so existing frontend
     * behavior is not broken.
     */
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    console.error(
      `[API/analyze] Analysis failed ${requestId} after ${durationMs}ms:`,
      error
    );

    /*
     * apiErrorResponse() remains the single source of truth for
     * converting application errors into safe API responses.
     *
     * We do not expose raw Gemini, Prisma, Clerk, or UploadThing
     * errors to the browser.
     */
    const response = apiErrorResponse(error, {
      fallbackMessage:
        "Something went wrong while analyzing your resume. Please try again.",
    });

    /*
     * Add a request identifier to the response so the frontend
     * can display/report it and server logs can be correlated.
     */
    response.headers.set("X-Request-ID", requestId);

    return response;
  }
}