import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { InterviewPlayer } from "@/components/dashboard/interview/interview-player";
import { requireUser } from "@/lib/auth";
import {
  getInterviewSession,
  listInterviewAnswers,
  listInterviewQuestions,
} from "@/lib/interview-service";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Mock Interview" };

export default async function InterviewPracticePage({
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

  const questions = await listInterviewQuestions(localUser.id, id);
  if (questions.length === 0) notFound();

  const answers = await listInterviewAnswers(localUser.id, id);

  return <InterviewPlayer session={interviewSession} questions={questions} initialAnswers={answers} />;
}
