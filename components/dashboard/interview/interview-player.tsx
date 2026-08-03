"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { InterviewEvaluationPanel } from "@/components/dashboard/interview/interview-evaluation-panel";
import {
  CATEGORY_LABELS,
  categoryTone,
  DIFFICULTY_LABELS,
  difficultyTone,
} from "@/components/dashboard/interview/interview-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type {
  InterviewAnswerItem,
  InterviewEvaluationItem,
  InterviewQuestionItem,
  InterviewSessionItem,
} from "@/lib/types/interview";
import { cn } from "@/lib/utils";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Human-readable message for a save failure, keyed by HTTP status. */
function saveErrorForStatus(status: number): string | null {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission.";
  if (status === 404) return "Interview question not found.";
  if (status >= 500) return "Unable to save your answer.";
  return null;
}

/** Product-friendly toast copy for an evaluation failure, keyed by HTTP status. */
function evaluationErrorForStatus(
  status: number,
  data: { title?: string; description?: string; error?: string }
): { title: string; description?: string } {
  if (status === 401) {
    return { title: "Your session expired", description: "Please sign in again." };
  }
  if (status === 404) {
    return {
      title: "Interview question not found",
      description: "This question may have been removed.",
    };
  }
  if (status === 400) {
    return {
      title: "Nothing to evaluate",
      description: data.error ?? "Write your answer before requesting feedback.",
    };
  }
  if (status === 429) {
    return {
      title: data.title ?? "AI service temporarily unavailable",
      description: data.description ?? "Please wait a moment before trying again.",
    };
  }
  if (status === 503) {
    return {
      title: data.title ?? "Our AI service is busy right now",
      description:
        data.description ??
        "We're experiencing higher than usual demand. Please try again shortly.",
    };
  }
  return {
    title: data.title ?? "Couldn't evaluate your answer",
    description:
      data.description ??
      "Something went wrong while evaluating your answer. Please try again in a few moments.",
  };
}

export function InterviewPlayer({
  session,
  questions,
  initialAnswers,
}: {
  session: InterviewSessionItem;
  questions: InterviewQuestionItem[];
  initialAnswers: InterviewAnswerItem[];
}) {
  const router = useRouter();
  const total = questions.length;
  const storageKey = `kaiken.interview.index.${session.id}`;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialAnswers.map((answer) => [answer.questionId, answer.answer]))
  );
  const [startedAt, setStartedAt] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialAnswers
        .filter((answer) => answer.startedAt)
        .map((answer) => [answer.questionId, answer.startedAt as string])
    )
  );
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, InterviewEvaluationItem>>(() => {
    const initial: Record<string, InterviewEvaluationItem> = {};
    for (const answer of initialAnswers) {
      if (answer.evaluation) {
        initial[answer.questionId] = answer.evaluation;
      }
    }
    return initial;
  });

  const answersRef = useRef(answers);
  const startedAtRef = useRef(startedAt);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  // Restore the last viewed question after a reload. Runs once on mount; the
  // timer-recording effect below is gated on `hydrated` so it never fires for
  // question 1 while the saved index is still being read.
  useEffect(() => {
    let restored = 0;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed < total) {
          restored = parsed;
        }
      }
    } catch {
      // localStorage unavailable (private mode etc.); fall back to question 1
    }
    queueMicrotask(() => {
      setCurrentIndex(restored);
      setHydrated(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the current question so a reload can restore it.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, String(currentIndex));
    } catch {
      // ignore storage failures
    }
  }, [currentIndex, hydrated, storageKey]);

  const question = questions[currentIndex];
  const questionId = question.id;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function persistAnswer(
    questionIdToSave: string,
    answer: string,
    startedAtToSave?: string
  ) {
    setSaving(true);
    try {
      const response = await fetch(`/api/interviews/${session.id}/answers/${questionIdToSave}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, ...(startedAtToSave ? { startedAt: startedAtToSave } : {}) }),
      });

      // An expired or missing Clerk session makes the middleware redirect to
      // the sign-in page; following the redirect yields an HTML document, not
      // JSON. Surface a readable message and route back to sign in instead of
      // parsing HTML.
      if (response.redirected) {
        toast.error("Save failed", {
          description: "Your session expired. Please sign in again.",
        });
        router.push("/sign-in");
        return;
      }

      // Never parse a non-JSON body: calling response.json() on HTML throws
      // `Unexpected token '<', "<!DOCTYPE"...`, so check Content-Type first.
      const contentType = response.headers.get("Content-Type") ?? "";
      const statusMessage = saveErrorForStatus(response.status);
      if (!contentType.includes("application/json")) {
        throw new Error(statusMessage ?? "Authentication required");
      }

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(statusMessage ?? data.error ?? `Save failed (${response.status})`);
      }

      setLastSavedAt(Date.now());
      setDirty(false);
    } catch (error) {
      const isNetworkFailure = error instanceof TypeError;
      toast.error("Save failed", {
        description: isNetworkFailure
          ? "Unable to reach the server."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(questionIdToSave: string, answer: string, startedAtToSave?: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistAnswer(questionIdToSave, answer, startedAtToSave);
    }, 800);
  }

  async function flushSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const current = questions[currentIndex];
    await persistAnswer(current.id, answersRef.current[current.id] ?? "");
  }

  // Lazily record when the user first opens a question so its timer can resume
  // after a reload. Persisted together with the current draft.
  useEffect(() => {
    if (!hydrated) return;
    if (!startedAtRef.current[questionId]) {
      const start = new Date().toISOString();
      setStartedAt((previous) => ({ ...previous, [questionId]: start }));
      scheduleSave(questionId, answersRef.current[questionId] ?? "", start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, hydrated]);

  async function handleAnswerChange(value: string) {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    setDirty(true);
    scheduleSave(questionId, value);
  }

  // Navigate immediately: persist the answer for the question being left in the
  // background so the click never waits on a network round-trip.
  function goTo(index: number) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const leaving = questions[currentIndex];
    void persistAnswer(leaving.id, answersRef.current[leaving.id] ?? "");
    setCurrentIndex(index);
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await flushSave();
      toast.success("Interview finished", {
        description: "Your answers were saved to this session.",
      });
      setFinishOpen(false);
      router.push(`/dashboard/interviews/${session.id}`);
      router.refresh();
    } finally {
      setFinishing(false);
    }
  }

  async function handleEvaluate() {
    if (evaluating) return;
    const current = questions[currentIndex];
    const answer = (answers[current.id] ?? "").trim();
    if (!answer) {
      toast.error("Nothing to evaluate", {
        description: "Write your answer before requesting feedback.",
      });
      return;
    }

    setEvaluating(true);
    const toastId = toast.loading("Evaluating your answer...");
    try {
      // Persist the latest draft first so the server evaluates the newest text.
      await flushSave();

      const response = await fetch(`/api/interviews/${session.id}/evaluate/${current.id}`, {
        method: "POST",
      });

      if (response.redirected) {
        toast.error("Evaluating failed", {
          id: toastId,
          description: "Your session expired. Please sign in again.",
        });
        router.push("/sign-in");
        return;
      }

      const contentType = response.headers.get("Content-Type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Authentication required");
      }

      const data = (await response.json()) as {
        evaluation?: InterviewEvaluationItem;
        title?: string;
        description?: string;
        error?: string;
      };

      if (!response.ok) {
        const { title, description } = evaluationErrorForStatus(response.status, data);
        toast.error(title, { id: toastId, description });
        return;
      }

      if (!data.evaluation) {
        toast.error("Couldn't evaluate your answer", {
          id: toastId,
          description:
            "Something went wrong while evaluating your answer. Please try again in a few moments.",
        });
        return;
      }

      setEvaluations((previous) => ({ ...previous, [current.id]: data.evaluation as InterviewEvaluationItem }));
      toast.success("Feedback ready", {
        id: toastId,
        description: "Review the evaluation for this answer.",
      });
    } catch (error) {
      const isNetworkFailure = error instanceof TypeError;
      toast.error("Couldn't evaluate your answer", {
        id: toastId,
        description: isNetworkFailure
          ? "Unable to reach the server."
          : error instanceof Error
            ? error.message
            : "Something went wrong while evaluating your answer. Please try again in a few moments.",
      });
    } finally {
      setEvaluating(false);
    }
  }

  const expectedSeconds = question.expectedDuration * 60;
  const start = startedAt[questionId];
  const elapsed = start ? Math.floor((now - new Date(start).getTime()) / 1000) : 0;
  const remaining = Math.max(0, expectedSeconds - elapsed);
  const isLast = currentIndex === total - 1;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  const hasAnswer = (answers[questionId] ?? "").trim().length > 0;
  const hasEvaluation = Boolean(evaluations[questionId]);
  const nextBlocked = hasAnswer && !hasEvaluation;

  return (
    <div className="flex flex-col gap-6">
      <Button
        render={<Link href={`/dashboard/interviews/${session.id}`} />}
        variant="ghost"
        className="text-muted-foreground w-fit -ml-2"
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Back to interview details
      </Button>

      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Mock Interview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {[session.jobRole, session.company].filter(Boolean).join(" — ") || "Untitled session"}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Question {currentIndex + 1} of {total}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
                remaining <= 30
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              <Clock className="size-3.5" aria-hidden="true" />
              {formatDuration(remaining)}
            </span>
          </div>

          <Progress value={progress} className="w-full" />

          <div className="flex flex-wrap items-center gap-2">
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

          <p className="text-lg leading-relaxed font-medium">{question.question}</p>

          <div className="flex flex-col gap-1.5">
            <Textarea
              value={answers[questionId] ?? ""}
              onChange={(event) => void handleAnswerChange(event.target.value)}
              onBlur={() => void flushSave()}
              placeholder="Type your answer here…"
              aria-label={`Answer for question ${currentIndex + 1}`}
              className="min-h-48 text-base"
            />
            <div className="flex items-center justify-end gap-2">
              {saving ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <Loader2 className="animate-spin size-3" aria-hidden="true" />
                  Saving…
                </span>
              ) : dirty ? (
                <span className="text-muted-foreground text-xs">Unsaved changes</span>
              ) : lastSavedAt && now - lastSavedAt < 8000 ? (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Saved
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Answer feedback</p>
                <p className="text-muted-foreground -mt-0.5 text-xs">
                  {hasEvaluation
                    ? "Your evaluation for this answer."
                    : "Get feedback on this answer before moving on."}
                </p>
              </div>
              {!hasEvaluation ? (
                <Button
                  onClick={() => void handleEvaluate()}
                  disabled={evaluating || !hasAnswer}
                  aria-label="Get feedback on this answer"
                >
                  {evaluating ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles aria-hidden="true" />
                  )}
                  {evaluating ? "Evaluating…" : "Get Feedback"}
                </Button>
              ) : null}
            </div>

            {evaluating ? (
              <Card className="border-border bg-card ring-foreground/10 ring-1">
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <Loader2
                    className="text-muted-foreground animate-spin size-6"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium">Evaluating your answer…</p>
                  <p className="text-muted-foreground -mt-2 text-xs">
                    This usually takes a few seconds.
                  </p>
                </CardContent>
              </Card>
            ) : hasEvaluation && evaluations[questionId] ? (
              <InterviewEvaluationPanel evaluation={evaluations[questionId]} />
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <ChevronLeft data-icon="inline-start" aria-hidden="true" />
              Previous
            </Button>
            {!isLast && nextBlocked ? (
              <span className="text-muted-foreground text-center text-xs">
                Get feedback before moving to the next question.
              </span>
            ) : null}
            {isLast ? (
              <Button onClick={() => setFinishOpen(true)}>
                <Flag data-icon="inline-start" aria-hidden="true" />
                Finish Interview
              </Button>
            ) : (
              <Button onClick={() => goTo(currentIndex + 1)} disabled={nextBlocked}>
                Next
                <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={finishOpen} onOpenChange={(nextOpen) => !finishing && setFinishOpen(nextOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish interview?</DialogTitle>
            <DialogDescription>
              Your answers will be saved to this session. You can return any time to review or
              edit them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)} disabled={finishing}>
              Cancel
            </Button>
            <Button onClick={handleFinish} disabled={finishing}>
              {finishing ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {finishing ? "Saving…" : "Finish Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <Mic className="size-3.5" aria-hidden="true" />
        Answers are auto-saved as you type.
      </div>
    </div>
  );
}
