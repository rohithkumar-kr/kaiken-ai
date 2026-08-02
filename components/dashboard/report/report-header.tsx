"use client";

import { ArrowLeft, Building2, CalendarDays, FileText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

import { ExportButton } from "./export-button";
import { GenerateCoverLetterButton } from "./generate-cover-letter-button";
import { ImproveResumeButton } from "./improve-resume-button";
import { fadeUp } from "./motion";
import type { ReportView } from "./types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[0.65rem] font-medium tracking-widest uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export function ReportHeader({ view }: { view: ReportView }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-4">
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
          <h1 className="text-2xl font-semibold tracking-tight">ATS Analysis Report</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            How your resume matches the role you are targeting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="border-border bg-card ring-foreground/10 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ring-1">
            {view.atsScore}
            <span className="text-muted-foreground font-normal"> / 100</span>
          </span>
          <ImproveResumeButton analysisId={view.id} />
          <GenerateCoverLetterButton analysisId={view.id} />
          <ExportButton analysisId={view.id} />
        </div>
      </div>

      <div className="border-border bg-card ring-foreground/10 grid gap-4 rounded-xl p-5 ring-1 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          icon={<FileText className="size-4" aria-hidden="true" />}
          label="Resume"
          value={view.resumeName ?? "—"}
        />
        <Detail icon={<Building2 className="size-4" aria-hidden="true" />} label="Role" value={view.jobTitle ?? "—"} />
        <Detail
          icon={<Building2 className="size-4" aria-hidden="true" />}
          label="Company"
          value={view.jobCompany ?? "—"}
        />
        <Detail
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          label="Analyzed"
          value={formatDate(view.analyzedAt)}
        />
      </div>
    </motion.div>
  );
}
