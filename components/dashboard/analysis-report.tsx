"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { KeywordCards } from "@/components/dashboard/report/keyword-cards";
import { ReportHeader } from "@/components/dashboard/report/report-header";
import { ScoreGauge } from "@/components/dashboard/report/score-gauge";
import { SectionScores } from "@/components/dashboard/report/section-scores";
import { StrengthWeakness } from "@/components/dashboard/report/strength-weakness";
import { SuggestionCards } from "@/components/dashboard/report/suggestion-cards";
import { SummaryCard } from "@/components/dashboard/report/summary-card";
import type { ReportView } from "@/components/dashboard/report/types";
import { fadeUp, staggerContainer } from "@/components/dashboard/report/motion";

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

const heroGrid: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

export function AnalysisReport({ view }: { view: ReportView }) {
  return (
    <motion.main
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-5xl flex-col gap-6"
    >
      <ReportHeader view={view} />

      <SummaryCard summary={view.summary} />

      <motion.div variants={heroGrid} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
        <motion.div
          variants={fadeUp}
          className="border-border bg-card ring-foreground/10 flex items-center justify-center rounded-xl py-8 ring-1"
        >
          <ScoreGauge score={view.atsScore} />
        </motion.div>
        <motion.div
          variants={fadeUp}
          className="border-border bg-card ring-foreground/10 rounded-xl p-6 ring-1"
        >
          <div className="mb-5">
            <h2 className="text-sm font-medium">Section scores</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              How each area of your resume compares.
            </p>
          </div>
          <SectionScores scores={view.sections} />
        </motion.div>
      </motion.div>

      <Panel title="Keyword analysis" description="Keywords found in and missing from your resume.">
        <KeywordCards matched={view.matched} missing={view.missing} />
      </Panel>

      <Panel title="Strengths & weaknesses" description="A balanced look at your resume.">
        <StrengthWeakness strengths={view.strengths} weaknesses={view.weaknesses} />
      </Panel>

      <SuggestionCards suggestions={view.suggestions} />
    </motion.main>
  );
}
