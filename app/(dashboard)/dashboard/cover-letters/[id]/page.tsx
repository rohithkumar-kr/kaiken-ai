import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { CoverLetterEditor } from "@/components/dashboard/cover-letter/cover-letter-editor";
import { requireUser } from "@/lib/auth";
import { getCoverLetter } from "@/lib/cover-letter-service";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Cover Letter" };

export default async function CoverLetterPage({
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

  const coverLetter = await getCoverLetter(localUser.id, id);
  if (!coverLetter) notFound();

  return (
    <CoverLetterEditor
      id={coverLetter.id}
      initialContent={coverLetter.content}
      candidateName={coverLetter.analysis?.resume?.parsedResume?.name ?? null}
      candidateEmail={coverLetter.analysis?.resume?.parsedResume?.email ?? null}
      candidatePhone={coverLetter.analysis?.resume?.parsedResume?.phone ?? null}
      jobTitle={coverLetter.analysis?.jobDescription?.title ?? null}
      jobCompany={coverLetter.analysis?.jobDescription?.company ?? null}
      resumeName={coverLetter.analysis?.resume?.fileName ?? null}
      createdAt={coverLetter.createdAt.toISOString()}
    />
  );
}
