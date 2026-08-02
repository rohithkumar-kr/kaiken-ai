import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { analyzeResume } from "@/lib/resume-service";

const analyzeSchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.enum(["pdf", "docx"]),
  fileSize: z.number().int().nonnegative().optional(),
  resumeId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUserPromise = currentUser();

  let body: z.infer<typeof analyzeSchema>;
  try {
    body = analyzeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clerkUser = await clerkUserPromise;
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`;

  try {
    const result = await analyzeResume({ userId, email, ...body });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while parsing your resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
