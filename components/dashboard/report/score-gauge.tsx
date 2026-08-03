"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

const SIZE = 180;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS = [
  {
    min: 95,
    label: "Excellent",
    text: "text-emerald-600 dark:text-emerald-400",
    stroke: "stroke-emerald-500",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    min: 80,
    label: "Good",
    text: "text-sky-600 dark:text-sky-400",
    stroke: "stroke-sky-500",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  {
    min: 65,
    label: "Average",
    text: "text-amber-600 dark:text-amber-400",
    stroke: "stroke-amber-500",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    min: 0,
    label: "Needs improvement",
    text: "text-rose-600 dark:text-rose-400",
    stroke: "stroke-rose-500",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
] as const;

function getStatus(score: number) {
  return STATUS.find((status) => score >= status.min) ?? STATUS[STATUS.length - 1];
}

export function ScoreGauge({ score, label = "ATS Score" }: { score: number; label?: string }) {
  const status = getStatus(score);
  const reduce = useReducedMotion();
  const progress = useSpring(0, { stiffness: 55, damping: 22 });
  const dashOffset = useTransform(progress, (value) => CIRCUMFERENCE * (1 - value / 100));
  const number = useTransform(progress, (value) => Math.round(value));

  useEffect(() => {
    progress.set(score);
  }, [progress, score]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid size-44 place-items-center sm:size-48">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            className="stroke-border"
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: reduce ? 0 : dashOffset }}
            className={status.stroke}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <motion.span
            className={cn(
              "text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl",
              status.text
            )}
          >
            {reduce ? score : number}
          </motion.span>
          <span className="text-muted-foreground mt-1 text-[0.65rem] font-medium tracking-widest uppercase">
            {label}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
          status.chip
        )}
      >
        {status.label}
      </span>
    </div>
  );
}
