import { NextResponse } from "next/server";

type ApiErrorOptions = {
  fallbackMessage?: string;
};

export function apiErrorResponse(
  error: unknown,
  options: ApiErrorOptions = {}
) {
  const fallbackMessage =
    options.fallbackMessage ?? "Something went wrong. Please try again.";

  const message = error instanceof Error ? error.message : "";

  if (message === "Resume not found") {
    return NextResponse.json(
      { error: "Resume not found." },
      { status: 404 }
    );
  }

  if (message === "Resume analysis is already in progress") {
    return NextResponse.json(
      { error: "Resume analysis is already in progress." },
      { status: 409 }
    );
  }

  if (
    message === "GEMINI_API_KEY is not set. Add it to your environment to run AI parsing."
  ) {
    console.error("[API] Gemini API key is not configured.");

    return NextResponse.json(
      { error: "AI service is not configured. Please try again later." },
      { status: 503 }
    );
  }

  if (
    message.includes("Gemini returned an empty response") ||
    message.includes("Gemini returned an unparseable JSON response") ||
    message.includes("Gemini returned invalid JSON") ||
    message.includes("Gemini returned an empty cover letter") ||
    message.includes("Gemini returned fewer than 15 questions")
  ) {
    console.error("[API] Gemini returned an invalid response:", message);

    return NextResponse.json(
      { error: "The AI service returned an invalid response. Please try again." },
      { status: 502 }
    );
  }

  console.error("[API] Unhandled error:", error);

  return NextResponse.json(
    { error: fallbackMessage },
    { status: 500 }
  );
}