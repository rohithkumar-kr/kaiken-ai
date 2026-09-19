import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const registerSchema = z.object({
  fileKey: z.string().min(1),
});

const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 500;

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: z.infer<typeof registerSchema>;

  try {
    body = registerSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const resume = await prisma.resume.findFirst({
      where: {
        fileKey: body.fileKey,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (resume) {
      return NextResponse.json({
        resumeId: resume.id,
      });
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS)
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Upload completed, but the resume record could not be found. Please try again.",
    },
    { status: 404 }
  );
}