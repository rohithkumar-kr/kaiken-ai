"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

import type { ReportKeyword } from "./types";
import { fadeUp } from "./motion";
import { cn } from "@/lib/utils";

function KeywordChip({ keyword, tone }: { keyword: ReportKeyword; tone: "matched" | "missing" }) {
  const matched = tone === "matched";
  return (
    <motion.span
      variants={fadeUp}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        matched
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      )}
    >
      {matched ? (
        <Check className="text-emerald-500 size-3.5" aria-hidden="true" />
      ) : (
        <X className="text-rose-500 size-3.5" aria-hidden="true" />
      )}
      {keyword.keyword}
      {keyword.count > 1 ? <span className="opacity-70">×{keyword.count}</span> : null}
    </motion.span>
  );
}

function KeywordPanel({
  title,
  keywords,
  tone,
  empty,
}: {
  title: string;
  keywords: ReportKeyword[];
  tone: "matched" | "missing";
  empty: string;
}) {
  const matched = tone === "matched";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span
          className={cn(
            "text-muted-foreground rounded-full border px-2 py-0.5 text-xs tabular-nums",
            matched ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"
          )}
        >
          {keywords.length}
        </span>
      </div>
      {keywords.length > 0 ? (
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-1.5"
        >
          {keywords.map((keyword) => (
            <KeywordChip key={keyword.id} keyword={keyword} tone={tone} />
          ))}
        </motion.div>
      ) : (
        <p className="text-muted-foreground text-sm italic">{empty}</p>
      )}
    </div>
  );
}

export function KeywordCards({
  matched,
  missing,
}: {
  matched: ReportKeyword[];
  missing: ReportKeyword[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border-border bg-card overflow-hidden rounded-xl p-5 ring-1 ring-foreground/10">
        <KeywordPanel
          title="Matched keywords"
          keywords={matched}
          tone="matched"
          empty="No matched keywords yet."
        />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-xl p-5 ring-1 ring-foreground/10">
        <KeywordPanel
          title="Missing keywords"
          keywords={missing}
          tone="missing"
          empty="No missing keywords — great job."
        />
      </div>
    </div>
  );
}
