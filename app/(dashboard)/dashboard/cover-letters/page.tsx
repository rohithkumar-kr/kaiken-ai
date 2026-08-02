import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { CoverLetterHistory } from "@/components/dashboard/cover-letter/cover-letter-history";
import { requireUser } from "@/lib/auth";
import { listCoverLetters } from "@/lib/cover-letter-service";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Cover Letters" };

export default async function CoverLettersPage() {
  const { userId } = await requireUser();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const localUser = await ensureUser(
    userId,
    clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`,
    clerkUser.firstName ?? clerkUser.username
  );

  const coverLetters = await listCoverLetters(localUser.id);

  return <CoverLetterHistory initialCoverLetters={coverLetters} />;
}
