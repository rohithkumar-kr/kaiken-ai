"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Mic,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  CATEGORY_LABELS,
  categoryTone,
  DIFFICULTY_LABELS,
  difficultyTone,
  EXPERIENCE_LABELS,
  TYPE_LABELS,
  typeTone,
} from "@/components/dashboard/interview/interview-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InterviewQuestionItem, InterviewSessionItem } from "@/lib/types/interview";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
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

function QuestionCard({ question }: { question: InterviewQuestionItem }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Question {question.questionNumber}
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
        <p className="text-sm leading-relaxed sm:text-base">{question.question}</p>
      </CardContent>
    </Card>
  );
}

export function InterviewSessionDetail({
  session,
  initialQuestions,
}: {
  session: InterviewSessionItem;
  initialQuestions: InterviewQuestionItem[];
}) {
  const role = [session.jobRole, session.company].filter(Boolean).join(" — ");

  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(initialQuestions);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    const toastId = toast.loading("Generating questions...");
    try {
      const response = await fetch(`/api/interviews/${session.id}/generate`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        questions?: InterviewQuestionItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate questions");
      }
      setQuestions(data.questions ?? []);
      toast.success("Questions generated", { id: toastId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error("Generation failed", { description: message, id: toastId });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        render={<Link href="/dashboard/interviews" />}
        variant="ghost"
        className="text-muted-foreground w-fit -ml-2"
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Back to interviews
      </Button>

      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Interview Details</h1>
          <p className="text-muted-foreground mt-1 text-sm">{role || "Untitled session"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              typeTone(session.interviewType)
            )}
          >
            {TYPE_LABELS[session.interviewType]}
          </span>
          <span className="border-border bg-card ring-foreground/10 rounded-full border px-2 py-0.5 text-xs font-medium ring-1">
            {EXPERIENCE_LABELS[session.experienceLevel]}
          </span>
        </div>
      </div>

      <div className="border-border bg-card ring-foreground/10 grid gap-4 rounded-xl p-5 ring-1 sm:grid-cols-2 lg:grid-cols-3">
        <Detail icon={<Target className="size-4" aria-hidden="true" />} label="Role" value={session.jobRole} />
        <Detail icon={<Building2 className="size-4" aria-hidden="true" />} label="Company" value={session.company ?? "—"} />
        <Detail
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          label="Created"
          value={formatDate(session.createdAt)}
        />
      </div>

      {session.reportGeneratedAt ? (
        <div className="border-border bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-6 ring-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="border-border bg-muted grid size-12 shrink-0 place-items-center rounded-full border">
              <FileText className="text-muted-foreground size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Latest Report</p>
              <p className="text-muted-foreground -mt-0.5 text-xs">
                {session.overallScore !== null
                  ? `${session.overallScore} / 100 overall`
                  : "Generated"}{" "}
                · {formatDate(session.completedAt ?? session.reportGeneratedAt)}
              </p>
            </div>
          </div>
          <Button
            render={<Link href={`/dashboard/interviews/${session.id}/report`} />}
            variant="outline"
            className="shrink-0"
          >
            View Report
          </Button>
        </div>
      ) : null}

      {questions.length === 0 ? (
        <div className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-4 rounded-xl p-10 text-center ring-1 sm:p-14">
          <span className="border-border bg-muted grid size-20 place-items-center rounded-full border">
            <Mic className="text-muted-foreground size-9" aria-hidden="true" />
          </span>
          <div className="max-w-md">
            <p className="text-base font-medium">No interview questions generated yet.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate a set of practice questions tailored to this role and experience level.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2">
            <Button variant="default" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles data-icon="inline-start" aria-hidden="true" />
              )}
              {generating ? "Generating..." : "Generate Questions"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Interview Questions</h2>
            <p className="text-muted-foreground -mt-2 text-sm">
              {questions.length} practice questions generated for this session.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>

          <div className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-6 text-center ring-1 sm:p-8">
            <p className="text-sm font-medium">Ready to practice?</p>
            <p className="text-muted-foreground -mt-2 text-sm">
              Answer each question one at a time in a timed mock interview. Your answers are saved
              automatically.
            </p>
            <Button
              render={<Link href={`/dashboard/interviews/${session.id}/practice`} />}
              variant="default"
              className="mt-1"
            >
              <Mic data-icon="inline-start" aria-hidden="true" />
              Start Interview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
