import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { JobDescriptions } from "@/components/dashboard/job-descriptions";
import { ResumeCards } from "@/components/dashboard/resume-cards";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listJobDescriptions } from "@/lib/job-description-service";
import { ensureUser, getLatestParsedResume, type DashboardResume } from "@/lib/resume-service";
import type { ParsedResumeData } from "@/lib/types/resume";

export const metadata: Metadata = { title: "Dashboard" };

function toParsedResumeData(
  resume: NonNullable<NonNullable<DashboardResume>["parsedResume"]>
): ParsedResumeData {
  return {
    name: resume.name,
    email: resume.email,
    phone: resume.phone,
    summary: resume.summary,
    skills: resume.skills.map((skill) => skill.name),
    experience: resume.experiences.map((item) => ({
      title: item.title,
      company: item.company,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate,
      description: item.description,
    })),
    projects: resume.projects.map((item) => ({
      name: item.name,
      description: item.description,
      technologies: (item.technologies ?? []) as string[],
      url: item.url,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    education: resume.educations.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate,
      endDate: item.endDate,
      grade: item.grade,
    })),
    certifications: resume.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      url: item.url,
    })),
  };
}

export default async function DashboardPage() {
  const { userId } = await requireUser();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const localUser = await ensureUser(
    userId,
    clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@kaiken.local`,
    clerkUser.firstName ?? clerkUser.username
  );
  const latest = await getLatestParsedResume(localUser.id);
  const parsed = latest?.parsedResume ? toParsedResumeData(latest.parsedResume) : null;
  const jobDescriptions = await listJobDescriptions(localUser.id);

  const firstName = clerkUser.firstName ?? clerkUser.username ?? "there";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
        <p className="text-muted-foreground mt-1">
          Upload your resume to get it parsed by precision AI — then compare and optimize it against
          any job description.
        </p>
      </div>

      <UploadZone
        resume={
          latest
            ? {
                id: latest.id,
                fileName: latest.fileName,
                fileType: latest.fileType.toLowerCase(),
                fileKey: latest.fileKey,
                fileSize: latest.fileSize,
                parseStatus: latest.parseStatus,
              }
            : null
        }
      />

      <JobDescriptions
        initialJobDescriptions={jobDescriptions}
        hasParsedResume={parsed !== null}
      />

      {parsed ? (
        <section aria-label="Parsed resume" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your parsed resume</h2>
            {latest ? (
              <p className="text-muted-foreground text-xs">
                {latest.fileName} · updated {latest.updatedAt.toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <ResumeCards data={parsed} />
        </section>
      ) : (
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>No resumes yet</CardTitle>
            <CardDescription>
              Upload your first resume to unlock the full picture — contact info, skills,
              experience, projects, education, and certifications, all extracted automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              ATS scoring and keyword matching are coming next.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
