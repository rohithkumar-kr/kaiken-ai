import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AnalysisReport } from "@/components/dashboard/analysis-report";
import { getAnalysis } from "@/lib/analysis-service";
import { requireUser } from "@/lib/auth";
import { toReportView } from "@/lib/report-view";
import { ensureUser } from "@/lib/resume-service";

export const metadata: Metadata = { title: "ATS Analysis Report" };

export default async function AnalysisReportPage({
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

  const analysis = await getAnalysis(localUser.id, id);
  if (!analysis) notFound();

  return <AnalysisReport view={toReportView(analysis)} />;
}
