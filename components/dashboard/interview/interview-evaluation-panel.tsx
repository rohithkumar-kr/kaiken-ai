import { CheckCircle2, Lightbulb, MessageSquareQuote, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { InterviewEvaluationItem } from "@/lib/types/interview";
import { cn } from "@/lib/utils";

function scoreTone(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (score >= 60) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

function Section({
  icon,
  label,
  items,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">No feedback provided.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li
              key={index}
              className={cn("flex items-start gap-2 text-sm leading-relaxed", tone)}
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {index + 1}.
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InterviewEvaluationPanel({
  evaluation,
}: {
  evaluation: InterviewEvaluationItem;
}) {
  return (
    <Card className="border-border bg-card ring-foreground/10 ring-1">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
              scoreTone(evaluation.score)
            )}
          >
            Score: {evaluation.score}/100
          </span>
          <span className="text-muted-foreground text-xs">
            Evaluated {new Date(evaluation.evaluatedAt).toLocaleString()}
          </span>
        </div>

        <Section
          icon={<CheckCircle2 className="text-emerald-600 size-4 dark:text-emerald-400" aria-hidden="true" />}
          label="Strengths"
          items={evaluation.strengths}
          tone="text-emerald-700 dark:text-emerald-300"
        />
        <Section
          icon={<XCircle className="text-rose-600 size-4 dark:text-rose-400" aria-hidden="true" />}
          label="Weaknesses"
          items={evaluation.weaknesses}
          tone="text-rose-700 dark:text-rose-300"
        />
        <Section
          icon={<Lightbulb className="text-amber-600 size-4 dark:text-amber-400" aria-hidden="true" />}
          label="Suggestions"
          items={evaluation.suggestions}
          tone="text-amber-700 dark:text-amber-300"
        />

        {evaluation.idealAnswer.trim() ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareQuote
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              Ideal answer
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {evaluation.idealAnswer}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
