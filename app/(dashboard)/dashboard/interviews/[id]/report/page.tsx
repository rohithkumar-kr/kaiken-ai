import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { InterviewReportView } from "@/components/dashboard/interview/interview-report";
import { requireUser } from "@/lib/auth";
import { getInterviewReport, getInterviewSession } from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Interview Report" };

export default async function InterviewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const localUser = await ensureUser(
    userId,
    clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`,
    clerkUser.firstName ?? clerkUser.username
  );

  const interviewSession = await getInterviewSession(localUser.id, id);
  if (!interviewSession) notFound();

  const initialReport = interviewSession.reportGeneratedAt
    ? await getInterviewReport(localUser.id, id)
    : null;

  return <InterviewReportView session={interviewSession} initialReport={initialReport} />;
}
