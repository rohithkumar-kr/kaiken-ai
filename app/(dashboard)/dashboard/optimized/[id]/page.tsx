import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { OptimizedResumeView } from "@/components/dashboard/optimized/optimized-resume-view";
import { requireUser } from "@/lib/auth";
import { toParsedResumeData } from "@/lib/parsed-resume";
import { getOptimizedResume } from "@/lib/optimize-service";
import { ensureUser } from "@/lib/resume-service";
import { optimizedResumeSchema } from "@/lib/types/optimize";

export const metadata: Metadata = { title: "Optimized Resume" };

export default async function OptimizedResumePage({
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

  const generated = await getOptimizedResume(localUser.id, id);
  if (!generated || !generated.sourceResume.parsedResume) notFound();

  const optimized = optimizedResumeSchema.safeParse(generated.data);
  if (!optimized.success) notFound();

  return (
    <OptimizedResumeView
      id={generated.id}
      original={toParsedResumeData(generated.sourceResume.parsedResume)}
      optimized={optimized.data}
      resumeName={generated.sourceResume.fileName}
      jobTitle={generated.jobDescription?.title ?? null}
    />
  );
}
