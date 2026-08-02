import type { DiffSegment } from "@/lib/resume-diff";
import { cn } from "@/lib/utils";

/** Renders a word-level diff segment list, highlighting additions (optimized)
 * or removals (original). Pass `side="original"` to emphasize removals and
 * `side="optimized"` to emphasize additions. */
export function DiffText({
  segments,
  side,
  className,
}: {
  segments: DiffSegment[];
  side: "original" | "optimized";
  className?: string;
}) {
  const visible = segments.filter(
    (segment) => segment.text.trim() && (side === "optimized" ? segment.type !== "removed" : segment.type !== "added")
  );

  if (visible.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {visible.map((segment, index) => {
        if (segment.type === "same") {
          return <span key={index}>{segment.text}</span>;
        }
        if (side === "optimized") {
          return (
            <mark
              key={index}
              className="bg-emerald-500/15 text-emerald-700 rounded-sm px-0.5 font-medium dark:text-emerald-300"
            >
              {segment.text}
            </mark>
          );
        }
        return (
          <span
            key={index}
            className="bg-rose-500/10 text-rose-700 rounded-sm px-0.5 line-through decoration-rose-400/70 dark:text-rose-300"
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}
