"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CircleDot,
  FileText,
  Loader2,
  Mic,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CATEGORY_LABELS,
  categoryTone,
  DIFFICULTY_LABELS,
  difficultyTone,
  EXPERIENCE_LABELS,
  TYPE_LABELS,
} from "@/components/dashboard/interview/interview-labels";
import { InterviewReportExportButton } from "@/components/dashboard/interview/interview-report-export-button";
import { fadeUp, staggerContainer } from "@/components/dashboard/report/motion";
import { ScoreGauge } from "@/components/dashboard/report/score-gauge";
import { SectionScores } from "@/components/dashboard/report/section-scores";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HIRING_RECOMMENDATION_LABELS } from "@/lib/interview-report";
import type {
  HiringRecommendation,
  InterviewReport,
  InterviewReportQuestion,
  InterviewSessionItem,
} from "@/lib/types/interview";
import { cn } from "@/lib/utils";

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

const HIRING_TONE: Record<HiringRecommendation, string> = {
  STRONG_HIRE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  HIRE: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  CONSIDER: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  NEEDS_IMPROVEMENT: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  NOT_READY: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function scoreTone(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (score >= 65) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
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

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={fadeUp}
      className="border-border bg-card ring-foreground/10 rounded-xl p-6 ring-1"
    >
      <div className="mb-5">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}

function BulletList({
  items,
  tone,
  empty,
}: {
  items: string[];
  tone: "strengths" | "neutral";
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm italic">{empty}</p>;
  }
  const isStrength = tone === "strengths";
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="text-muted-foreground flex items-start gap-2 text-sm leading-relaxed">
          {isStrength ? (
            <CheckCircle2 className="text-emerald-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleDot className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestionCard({ question, index }: { question: InterviewReportQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Question {index + 1}
            </span>
            <Badge variant="outline" className={cn("rounded-full", categoryTone(question.category))}>
              {CATEGORY_LABELS[question.category]}
            </Badge>
            <Badge
              variant="outline"
              className={cn("rounded-full", difficultyTone(question.difficulty))}
            >
              {DIFFICULTY_LABELS[question.difficulty]}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground rounded-full">
              <Clock aria-hidden="true" />
              {question.expectedDuration} min
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums", scoreTone(question.score))}>
              {question.score}%
            </span>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-4 transition-transform",
                expanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </button>
        {expanded ? (
          <div className="flex flex-col gap-4 border-t pt-3">
            <p className="text-sm leading-relaxed sm:text-base">{question.question}</p>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Your answer
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {question.answer.trim() || "No answer recorded."}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function InterviewReportView({
  session,
  initialReport,
}: {
  session: InterviewSessionItem;
  initialReport: InterviewReport | null;
}) {
  const [report, setReport] = useState<InterviewReport | null>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReport) return;
    let cancelled = false;

    async function generate() {
      setGenerating(true);
      try {
        const response = await fetch(`/api/interviews/${session.id}/report`, { method: "POST" });
        if (response.redirected) return;
        const data = (await response.json().catch(() => null)) as {
          report?: InterviewReport | null;
          error?: string;
        } | null;
        if (cancelled) return;
        if (response.ok && data?.report) {
          setReport(data.report);
        } else if (response.status === 400 && data?.report === null) {
          setNotReady(true);
        } else if (response.status === 404) {
          setError("This interview session could not be found.");
        } else {
          setError(data?.error ?? "Couldn't generate your report. Please try again.");
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }

    void generate();
    return () => {
      cancelled = true;
    };
  }, [initialReport, session.id]);

  return (
    <motion.main
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-5xl flex-col gap-6"
    >
      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <Button
          render={<Link href={`/dashboard/interviews/${session.id}`} />}
          variant="ghost"
          className="text-muted-foreground w-fit -ml-2"
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to interview details
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Interview Report</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              How you performed in this mock interview.
            </p>
          </div>
          {report ? (
            <div className="flex items-center gap-2">
              <span className="border-border bg-card ring-foreground/10 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ring-1">
                {report.overallScore}
                <span className="text-muted-foreground font-normal"> / 100</span>
              </span>
              <InterviewReportExportButton sessionId={session.id} />
            </div>
          ) : null}
        </div>

        <div className="border-border bg-card ring-foreground/10 grid gap-4 rounded-xl p-5 ring-1 sm:grid-cols-2 lg:grid-cols-5">
          <Detail icon={<Target className="size-4" aria-hidden="true" />} label="Role" value={session.jobRole} />
          <Detail icon={<Building2 className="size-4" aria-hidden="true" />} label="Company" value={session.company ?? "—"} />
          <Detail
            icon={<FileText className="size-4" aria-hidden="true" />}
            label="Interview"
            value={TYPE_LABELS[session.interviewType]}
          />
          <Detail
            icon={<Target className="size-4" aria-hidden="true" />}
            label="Experience"
            value={EXPERIENCE_LABELS[session.experienceLevel]}
          />
          <Detail
            icon={<CalendarDays className="size-4" aria-hidden="true" />}
            label="Completed"
            value={formatDate(report?.completedAt ?? null)}
          />
        </div>
      </motion.div>

      {generating && !report ? (
        <motion.div variants={fadeUp} className="border-border bg-card ring-foreground/10 rounded-xl p-10 text-center ring-1">
          <Loader2 className="text-muted-foreground mx-auto animate-spin size-6" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Preparing your report…</p>
          <p className="text-muted-foreground -mt-0.5 text-xs">This usually takes a moment.</p>
        </motion.div>
      ) : null}

      {error && !report ? (
        <motion.div variants={fadeUp} className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-4 rounded-xl p-10 text-center ring-1">
          <span className="border-border bg-muted grid size-20 place-items-center rounded-full border">
            <FileText className="text-muted-foreground size-9" aria-hidden="true" />
          </span>
          <div className="max-w-md">
            <p className="text-base font-medium">Unable to load your report</p>
            <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          </div>
          <Button
            render={<Link href={`/dashboard/interviews/${session.id}`} />}
            variant="outline"
          >
            Back to interview details
          </Button>
        </motion.div>
      ) : null}

      {notReady && !report ? (
        <motion.div variants={fadeUp} className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-4 rounded-xl p-10 text-center ring-1 sm:p-14">
          <span className="border-border bg-muted grid size-20 place-items-center rounded-full border">
            <Mic className="text-muted-foreground size-9" aria-hidden="true" />
          </span>
          <div className="max-w-md">
            <p className="text-base font-medium">No answers evaluated yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Evaluate at least one answer to unlock your interview report.
            </p>
          </div>
          <Button
            render={<Link href={`/dashboard/interviews/${session.id}/practice`} />}
            variant="default"
            className="mt-1"
          >
            <Mic data-icon="inline-start" aria-hidden="true" />
            Continue Interview
          </Button>
        </motion.div>
      ) : null}

      {report ? (
        <>
          <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-2">
            <div className="border-border bg-card ring-foreground/10 flex flex-col items-center justify-center gap-4 rounded-xl py-8 ring-1">
              <ScoreGauge score={report.overallScore} label="Overall Score" />
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-muted-foreground text-[0.65rem] font-medium tracking-widest uppercase">
                  Hiring recommendation
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
                    HIRING_TONE[report.hiringRecommendation]
                  )}
                >
                  {HIRING_RECOMMENDATION_LABELS[report.hiringRecommendation]}
                </span>
              </div>
            </div>
            <motion.div
              variants={fadeUp}
              className="border-border bg-card ring-foreground/10 rounded-xl p-6 ring-1"
            >
              <div className="mb-5">
                <h2 className="text-sm font-medium">Performance by category</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  How you scored across each question category.
                </p>
              </div>
              <SectionScores
                scores={report.categoryScores.map((section) => ({
                  label: CATEGORY_LABELS[section.category],
                  value: section.score,
                }))}
              />
            </motion.div>
          </motion.div>

          <Panel title="Summary" description="A quick overview of your performance.">
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              {report.summary}
            </p>
          </Panel>

          <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-3">
            <Panel title="Strengths" description="Where you stood out.">
              <BulletList
                items={report.strengths}
                tone="strengths"
                empty="No strengths identified."
              />
            </Panel>
            <Panel title="Areas to improve" description="What to focus on next.">
              <BulletList
                items={report.weaknesses}
                tone="neutral"
                empty="No areas to improve identified — impressive."
              />
            </Panel>
            <Panel title="Recommendations" description="Suggested next steps.">
              <BulletList
                items={report.recommendations}
                tone="neutral"
                empty="No recommendations yet."
              />
            </Panel>
          </motion.div>

          <motion.div variants={fadeUp} className="border-border bg-card ring-foreground/10 rounded-xl p-6 ring-1">
            <div className="mb-5">
              <h2 className="text-sm font-medium">Question breakdown</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Every evaluated question with its score and your answer.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {report.questions.map((question, index) => (
                <QuestionCard key={question.questionId} question={question} index={index} />
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </motion.main>
  );
}
