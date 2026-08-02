import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { AnalysisHistory } from "@/components/dashboard/analysis-history";
import { listAnalyses } from "@/lib/analysis-service";
import { requireUser } from "@/lib/auth";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "Analysis History" };

export default async function HistoryPage() {
  const { userId } = await requireUser();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const localUser = await ensureUser(
    userId,
    clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`,
    clerkUser.firstName ?? clerkUser.username
  );

  const analyses = await listAnalyses(localUser.id);

  return <AnalysisHistory initialAnalyses={analyses} />;
}
