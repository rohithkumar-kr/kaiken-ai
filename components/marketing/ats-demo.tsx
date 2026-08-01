"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { EASE } from "./motion";
import { SectionHeading } from "./section-heading";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const BARS = [
  { label: "Keywords", value: 92 },
  { label: "Formatting", value: 88 },
  { label: "Experience", value: 84 },
  { label: "Readability", value: 79 },
];

const KEYWORDS = ["React", "TypeScript", "AWS", "Next.js", "CI/CD"];

const SUGGESTIONS = [
  {
    tone: "good",
    text: "Formatting parses cleanly with standard ATS parsers.",
  },
  {
    tone: "warn",
    text: "Missing \u201CSEO\u201D — appears in 62% of target job descriptions.",
  },
  {
    tone: "warn",
    text: "3 bullet points lack measurable impact; add metrics.",
  },
];

function ScoreRing({ score }: { score: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-48px" });
  const progress = useSpring(0, { stiffness: 55, damping: 22 });
  const dashOffset = useTransform(progress, (v) => RING_CIRCUMFERENCE * (1 - v));
  const number = useTransform(progress, (v) => Math.round(v * 100));

  useEffect(() => {
    progress.set(inView ? score / 100 : 0);
  }, [inView, score, progress]);

  return (
    <div ref={ref} className="relative mx-auto grid size-40 place-items-center sm:size-44">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-border"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-foreground"
          strokeDasharray={RING_CIRCUMFERENCE}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span className="text-5xl font-semibold tracking-tight tabular-nums">
          {number}
        </motion.span>
        <span className="text-muted-foreground mt-1 text-[0.65rem] font-medium tracking-widest uppercase">
          ATS Score
        </span>
      </div>
    </div>
  );
}

function Bar({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
        <motion.div
          className="bg-foreground h-full rounded-full"
          initial={{ width: "0%" }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: EASE }}
        />
      </div>
    </div>
  );
}

function Sparkline() {
  return (
    <svg viewBox="0 0 120 32" className="text-foreground h-8 w-full" aria-hidden="true">
      <polyline
        points="0,24 15,22 30,25 45,18 60,20 75,12 90,14 105,8 120,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0,24 15,22 30,25 45,18 60,20 75,12 90,14 105,8 120,10 L120,32 L0,32 Z"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

export function AtsDemo() {
  const [score, setScore] = useState(87);

  return (
    <section id="demo" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <RevealHeading />
        <div className="bg-background mt-16 overflow-hidden rounded-2xl border shadow-xl">
          <div className="bg-muted/40 flex items-center justify-between gap-4 border-b px-5 py-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="bg-border size-2.5 rounded-full" />
              <span className="bg-border size-2.5 rounded-full" />
              <span className="bg-border size-2.5 rounded-full" />
            </div>
            <span className="bg-background text-muted-foreground hidden rounded-md border px-3 py-1 font-mono text-xs sm:block">
              app.kaiken.ai/ats
            </span>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="bg-border size-2.5 rounded-full" />
              <span className="bg-border size-2.5 rounded-full" />
              <span className="bg-border size-2.5 rounded-full" />
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2">
            <div className="flex flex-col gap-8">
              <ScoreRing score={score} />
              <div className="flex flex-col gap-4">
                {BARS.map((bar, i) => (
                  <Bar key={bar.label} {...bar} delay={0.1 + i * 0.08} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-muted-foreground text-sm font-medium">Top keyword matches</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {KEYWORDS.map((keyword) => (
                    <span
                      key={keyword}
                      className="bg-muted/50 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                    >
                      <CheckCircle2 className="text-foreground size-3.5" aria-hidden="true" />
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-muted-foreground text-sm font-medium">AI suggestions</h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {SUGGESTIONS.map((suggestion) => (
                    <li
                      key={suggestion.text}
                      className="bg-background flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
                    >
                      {suggestion.tone === "good" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <TriangleAlert
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-muted-foreground">{suggestion.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/30 mt-auto rounded-xl border border-dashed p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Score trend
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">71 → 87</p>
                  </div>
                  <div className="w-28">
                    <Sparkline />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setScore(70 + Math.floor(Math.random() * 26))}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  Run analysis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RevealHeading() {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 text-center"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <SectionHeading
        eyebrow="Live demo"
        title="See your ATS score at a glance"
        description="A preview of the analysis dashboard — accurate scoring, keyword insights, and prioritized suggestions."
      />
    </motion.div>
  );
}
