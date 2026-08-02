import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createJobDescription, listJobDescriptions } from "@/lib/job-description-service";
import { ensureUser } from "@/lib/resume-service";
import { jobDescriptionInputSchema } from "@/lib/types/job-description";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  const jobDescriptions = await listJobDescriptions(localUser.id);
  return NextResponse.json({ jobDescriptions });
}

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

  const parsed = jobDescriptionInputSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const clerkUser = await clerkUserPromise;
  const localUser = await ensureUser(
    userId,
    clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`
  );

  try {
    const jobDescription = await createJobDescription(localUser.id, parsed.data);
    return NextResponse.json({ jobDescription }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while saving the job description";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
