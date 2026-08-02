"use client";

import {
  ArrowLeft,
  ArrowDown,
  Briefcase,
  Download,
  FileDown,
  FileText,
  FolderKanban,
  GraduationCap,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { DiffText } from "@/components/dashboard/optimized/diff-text";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  diffParagraphs,
  diffText,
  matchEducation,
  matchExperience,
  matchProjects,
  skillStatus,
  type DiffSegment,
} from "@/lib/resume-diff";
import type { OptimizedResumeData } from "@/lib/types/optimize";
import type { ParsedResumeData } from "@/lib/types/resume";
import { cn } from "@/lib/utils";

type ExportFormat = "pdf" | "markdown";

function SectionHeader({
  icon: Icon,
  title,
  side,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  side: "original" | "optimized";
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="bg-muted/50 grid size-7 place-items-center rounded-md border">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold">
        {side === "optimized" ? (
          <span className="inline-flex items-center gap-1.5">
            {title}
            <Sparkles className="text-amber-500 size-3.5" aria-hidden="true" />
          </span>
        ) : (
          title
        )}
      </h3>
    </div>
  );
}

function Column({
  side,
  label,
  children,
}: {
  side: "original" | "optimized";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-[0.65rem] font-semibold tracking-widest uppercase",
            side === "original"
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {label}
        </span>
        {side === "optimized" ? (
          <span className="text-muted-foreground text-xs">improved wording, keywords inserted</span>
        ) : (
          <span className="text-muted-foreground text-xs">strikethrough = changed</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ItemCard({
  side,
  removed,
  added,
  children,
}: {
  side: "original" | "optimized";
  removed?: boolean;
  added?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border rounded-lg border p-3",
        side === "optimized" && added && "border-emerald-500/40 bg-emerald-500/5",
        side === "original" && removed && "border-rose-500/40 bg-rose-500/5",
        side === "optimized" && !added && "bg-card",
        side === "original" && !removed && "bg-card"
      )}
    >
      {children}
    </div>
  );
}

function SkillsDiff({
  original,
  optimized,
  side,
}: {
  original: string[];
  optimized: string[];
  side: "original" | "optimized";
}) {
  const { added, removed } = skillStatus(original, optimized);
  const set = new Set(optimized.map((skill) => skill.toLowerCase()));
  const origSet = new Set(original.map((skill) => skill.toLowerCase()));

  const chips =
    side === "optimized"
      ? optimized.map((skill) => ({
          skill,
          changed: added.some((a) => a.toLowerCase() === skill.toLowerCase()),
        }))
      : original.map((skill) => ({
          skill,
          changed: removed.some((r) => r.toLowerCase() === skill.toLowerCase()),
        }));

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ skill, changed }) => {
        const isAdded = side === "optimized" && !origSet.has(skill.toLowerCase());
        const isRemoved = side === "original" && !set.has(skill.toLowerCase());
        return (
          <span
            key={skill}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              isAdded
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : isRemoved
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 line-through decoration-rose-400/70 dark:text-rose-300"
                  : changed
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-muted/50 border-border"
            )}
          >
            {skill}
          </span>
        );
      })}
      {chips.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : null}
    </div>
  );
}

function ExperienceSection({
  original,
  optimized,
  side,
}: {
  original: ParsedResumeData["experience"];
  optimized: OptimizedResumeData["experience"];
  side: "original" | "optimized";
}) {
  const pairs = matchExperience(original, optimized);

  return (
    <div className="flex flex-col gap-3">
      {pairs.map((pair, index) => {
        const originalTitle = pair.original?.title ?? "";
        const optimizedTitle = pair.updated?.title ?? "";
        const originalCompany = pair.original?.company ?? "";
        const optimizedCompany = pair.updated?.company ?? "";
        const isRemoved = side === "original" && pair.updated === null;
        const isAdded = side === "optimized" && pair.original === null;

        const titleSegments: DiffSegment[] =
          side === "optimized"
            ? diffText(originalTitle, optimizedTitle)
            : diffText(originalTitle, optimizedTitle);
        const companySegments = diffText(originalCompany, optimizedCompany);

        const dates =
          side === "optimized"
            ? [pair.updated?.startDate, pair.updated?.endDate]
            : [pair.original?.startDate, pair.original?.endDate];
        const location =
          side === "optimized" ? pair.updated?.location : pair.original?.location;
        const description =
          side === "optimized"
            ? pair.updated?.description ?? pair.original?.description
            : pair.original?.description ?? pair.updated?.description;
        const descOriginal =
          side === "optimized"
            ? pair.original?.description ?? ""
            : pair.original?.description ?? "";
        const descOptimized =
          side === "optimized"
            ? pair.updated?.description ?? ""
            : pair.updated?.description ?? "";

        return (
          <ItemCard key={index} side={side} removed={isRemoved} added={isAdded}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <DiffText segments={titleSegments} side={side} />
                  {companySegments.some((s) => s.text.trim()) ? (
                    <span className="text-muted-foreground font-normal">
                      {" · "}
                      <DiffText segments={companySegments} side={side} />
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[location, dates.filter(Boolean).join(" — ")].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {isAdded ? (
                <span className="text-emerald-700 text-[0.65rem] font-semibold tracking-wider uppercase dark:text-emerald-300">
                  added
                </span>
              ) : isRemoved ? (
                <span className="text-rose-700 text-[0.65rem] font-semibold tracking-wider uppercase dark:text-rose-300">
                  removed
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                <DiffText
                  segments={diffText(descOriginal, descOptimized)}
                  side={side}
                />
              </p>
            ) : null}
          </ItemCard>
        );
      })}
      {pairs.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : null}
    </div>
  );
}

function ProjectsSection({
  original,
  optimized,
  side,
}: {
  original: ParsedResumeData["projects"];
  optimized: OptimizedResumeData["projects"];
  side: "original" | "optimized";
}) {
  const pairs = matchProjects(original, optimized);

  return (
    <div className="flex flex-col gap-3">
      {pairs.map((pair, index) => {
        const isRemoved = side === "original" && pair.updated === null;
        const isAdded = side === "optimized" && pair.original === null;
        const originalName = pair.original?.name ?? "";
        const optimizedName = pair.updated?.name ?? "";
        const description =
          side === "optimized"
            ? pair.updated?.description ?? pair.original?.description
            : pair.original?.description ?? pair.updated?.description;
        const descOriginal =
          side === "optimized" ? pair.original?.description ?? "" : pair.original?.description ?? "";
        const descOptimized =
          side === "optimized" ? pair.updated?.description ?? "" : pair.updated?.description ?? "";

        const originalTech = pair.original?.technologies ?? [];
        const optimizedTech = pair.updated?.technologies ?? [];

        return (
          <ItemCard key={index} side={side} removed={isRemoved} added={isAdded}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                <DiffText
                  segments={diffText(originalName, optimizedName)}
                  side={side}
                />
              </p>
              {isAdded ? (
                <span className="text-emerald-700 text-[0.65rem] font-semibold tracking-wider uppercase dark:text-emerald-300">
                  added
                </span>
              ) : isRemoved ? (
                <span className="text-rose-700 text-[0.65rem] font-semibold tracking-wider uppercase dark:text-rose-300">
                  removed
                </span>
              ) : null}
            </div>
            {optimizedTech.length > 0 || originalTech.length > 0 ? (
              <p className="text-muted-foreground mt-0.5 text-xs">
                <DiffText
                  segments={diffText(originalTech.join(", "), optimizedTech.join(", "))}
                  side={side}
                />
              </p>
            ) : null}
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                <DiffText segments={diffText(descOriginal, descOptimized)} side={side} />
              </p>
            ) : null}
          </ItemCard>
        );
      })}
      {pairs.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : null}
    </div>
  );
}

function EducationSection({
  original,
  optimized,
  side,
}: {
  original: ParsedResumeData["education"];
  optimized: OptimizedResumeData["education"];
  side: "original" | "optimized";
}) {
  const pairs = matchEducation(original, optimized);

  return (
    <div className="flex flex-col gap-3">
      {pairs.map((pair, index) => {
        const isRemoved = side === "original" && pair.updated === null;
        const isAdded = side === "optimized" && pair.original === null;
        const originalInstitution = pair.original?.institution ?? "";
        const optimizedInstitution = pair.updated?.institution ?? "";
        const originalDegree = pair.original?.degree ?? "";
        const optimizedDegree = pair.updated?.degree ?? "";

        return (
          <ItemCard key={index} side={side} removed={isRemoved} added={isAdded}>
            <p className="text-sm font-medium">
              <DiffText
                segments={diffText(originalInstitution, optimizedInstitution)}
                side={side}
              />
              {diffText(originalDegree, optimizedDegree).some((s) => s.text.trim()) ? (
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  <DiffText segments={diffText(originalDegree, optimizedDegree)} side={side} />
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {side === "optimized"
                ? [pair.updated?.fieldOfStudy, [pair.updated?.startDate, pair.updated?.endDate].filter(Boolean).join(" — ")]
                    .filter(Boolean)
                    .join(" · ") || "—"
                : [pair.original?.fieldOfStudy, [pair.original?.startDate, pair.original?.endDate].filter(Boolean).join(" — ")]
                    .filter(Boolean)
                    .join(" · ") || "—"}
            </p>
          </ItemCard>
        );
      })}
      {pairs.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : null}
    </div>
  );
}

export function OptimizedResumeView({
  id,
  original,
  optimized,
  resumeName,
  jobTitle,
}: {
  id: string;
  original: ParsedResumeData;
  optimized: OptimizedResumeData;
  resumeName: string | null;
  jobTitle: string | null;
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (exporting) return;
    setExporting(format);
    const toastId = toast.loading(format === "pdf" ? "Generating PDF..." : "Preparing Markdown...");
    try {
      const response = await fetch(`/api/generated-resumes/${id}/export?format=${format}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to export the resume");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `optimized-resume.${format === "pdf" ? "pdf" : "md"}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(format === "pdf" ? "PDF downloaded" : "Markdown downloaded", { id: toastId });
    } catch {
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(null);
    }
  }

  const summaryOriginal = original.summary ?? "";
  const summaryOptimized = optimized.summary ?? "";
  const summarySegments = diffParagraphs(summaryOriginal, summaryOptimized);

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto flex max-w-6xl flex-col gap-6"
    >
      <div className="flex flex-col gap-4">
        <Button
          render={<Link href="/dashboard" />}
          variant="ghost"
          className="text-muted-foreground w-fit -ml-2"
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to dashboard
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Optimized Resume</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your resume rewritten to score higher against this role.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {[resumeName, jobTitle].filter(Boolean).join(" · ") || "Optimized from your resume"}
            </p>
          </div>
          <Menu>
            <MenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={exporting !== null} />
              }
            >
              {exporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download data-icon="inline-start" aria-hidden="true" />
              )}
              {exporting ? "Exporting…" : "Export"}
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
                aria-label="Download optimized resume as PDF"
              >
                <FileDown aria-hidden="true" />
                Download PDF
              </MenuItem>
              <MenuItem
                onClick={() => handleExport("markdown")}
                disabled={exporting !== null}
                aria-label="Download optimized resume as Markdown"
              >
                <FileText aria-hidden="true" />
                Download Markdown
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="border-border bg-card ring-foreground/10 rounded-xl p-5 ring-1">
          <Column side="original" label="Original resume">
            <div className="flex flex-col gap-5">
              <div>
                <SectionHeader icon={User} title="Summary" side="original" />
                {summarySegments.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {summarySegments.map((paragraph, index) => (
                      <p key={index} className="text-muted-foreground text-sm leading-relaxed">
                        <DiffText segments={paragraph} side="original" />
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div>
                <SectionHeader icon={Sparkles} title="Skills" side="original" />
                <SkillsDiff original={original.skills} optimized={optimized.skills} side="original" />
              </div>

              <div>
                <SectionHeader icon={Briefcase} title="Experience" side="original" />
                <ExperienceSection
                  original={original.experience}
                  optimized={optimized.experience}
                  side="original"
                />
              </div>

              <div>
                <SectionHeader icon={FolderKanban} title="Projects" side="original" />
                <ProjectsSection
                  original={original.projects}
                  optimized={optimized.projects}
                  side="original"
                />
              </div>

              <div>
                <SectionHeader icon={GraduationCap} title="Education" side="original" />
                <EducationSection
                  original={original.education}
                  optimized={optimized.education}
                  side="original"
                />
              </div>
            </div>
          </Column>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="border-border bg-card ring-foreground/10 grid size-9 place-items-center rounded-full ring-1">
            <ArrowDown className="text-emerald-600 size-4 dark:text-emerald-400" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-xs">
            AI optimized against this role
          </p>
        </div>

        <div className="border-emerald-500/30 bg-card ring-emerald-500/20 rounded-xl p-5 ring-1">
          <Column side="optimized" label="Optimized resume">
            <div className="flex flex-col gap-5">
              <div>
                <SectionHeader icon={User} title="Summary" side="optimized" />
                {summarySegments.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {summarySegments.map((paragraph, index) => (
                      <p key={index} className="text-muted-foreground text-sm leading-relaxed">
                        <DiffText segments={paragraph} side="optimized" />
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div>
                <SectionHeader icon={Sparkles} title="Skills" side="optimized" />
                <SkillsDiff original={original.skills} optimized={optimized.skills} side="optimized" />
              </div>

              <div>
                <SectionHeader icon={Briefcase} title="Experience" side="optimized" />
                <ExperienceSection
                  original={original.experience}
                  optimized={optimized.experience}
                  side="optimized"
                />
              </div>

              <div>
                <SectionHeader icon={FolderKanban} title="Projects" side="optimized" />
                <ProjectsSection
                  original={original.projects}
                  optimized={optimized.projects}
                  side="optimized"
                />
              </div>

              <div>
                <SectionHeader icon={GraduationCap} title="Education" side="optimized" />
                <EducationSection
                  original={original.education}
                  optimized={optimized.education}
                  side="optimized"
                />
              </div>
            </div>
          </Column>
        </div>
      </div>
    </motion.main>
  );
}
