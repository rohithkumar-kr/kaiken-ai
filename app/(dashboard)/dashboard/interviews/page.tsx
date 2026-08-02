import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { InterviewSessions } from "@/components/dashboard/interview/interview-sessions";
import { requireUser } from "@/lib/auth";
import { listInterviewSessions } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Interviews" };

export default async function InterviewsPage() {
  const { userId } = await requireUser();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const localUser = await ensureUser(
    userId,
    clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`,
    clerkUser.firstName ?? clerkUser.username
  );

  const interviewSessions = await listInterviewSessions(localUser.id);

  return <InterviewSessions initialInterviewSessions={interviewSessions} />;
}
