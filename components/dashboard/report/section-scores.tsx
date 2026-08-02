"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "framer-motion";
import { useEffect } from "react";

import type { ReportSectionScore } from "./types";
import { EASE } from "./motion";

function ScoreBar({ label, value }: ReportSectionScore) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useTransform(progress, (v) => `${v}%`);
  const number = useTransform(progress, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      progress.set(value);
      return;
    }
    const controls = animate(progress, value, { duration: 1, ease: EASE });
    return controls.stop;
  }, [progress, value, reduce]);

  const variants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  };

  return (
    <motion.div variants={variants} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          <motion.span>{reduce ? value : number}</motion.span>
          <span>%</span>
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <motion.div className="bg-primary h-full rounded-full" style={{ width }} />
      </div>
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

export function SectionScores({ scores }: { scores: ReportSectionScore[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5"
    >
      {scores.map((score) => (
        <ScoreBar key={score.label} {...score} />
      ))}
    </motion.div>
  );
}
