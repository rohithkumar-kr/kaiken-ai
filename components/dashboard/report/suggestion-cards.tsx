"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { cn } from "@/lib/utils";

import { fadeUp } from "./motion";
import type { ReportSuggestion } from "./types";

const SEVERITY = {
  HIGH: {
    label: "High priority",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  MEDIUM: {
    label: "Medium",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  LOW: {
    label: "Low",
    chip: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
} as const;

const TYPE_LABEL: Record<ReportSuggestion["type"], string> = {
  CONTENT: "Content",
  KEYWORD: "Keyword",
  FORMAT: "Format",
  ACTION: "Action",
};

function SuggestionCard({ suggestion }: { suggestion: ReportSuggestion }) {
  const severity = SEVERITY[suggestion.severity];

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="border-border group/card bg-card ring-foreground/10 rounded-xl p-5 ring-1 transition-shadow hover:shadow-lg"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            severity.chip
          )}
        >
          {severity.label}
        </span>
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {TYPE_LABEL[suggestion.type]}
        </span>
      </div>
      <h4 className="mt-3 text-sm font-medium">{suggestion.title}</h4>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {suggestion.description}
      </p>
      {suggestion.aiRewrite ? (
        <p className="text-muted-foreground mt-3 rounded-lg bg-muted px-3 py-2 text-sm italic leading-relaxed">
          {suggestion.aiRewrite}
        </p>
      ) : null}
    </motion.article>
  );
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

export function SuggestionCards({ suggestions }: { suggestions: ReportSuggestion[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">AI suggestions</h3>
      {suggestions.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </motion.div>
      ) : (
        <div className="border-border bg-card ring-foreground/10 rounded-xl p-5 ring-1">
          <p className="text-muted-foreground text-sm italic">
            No suggestions yet — your resume is looking strong.
          </p>
        </div>
      )}
    </div>
  );
}
