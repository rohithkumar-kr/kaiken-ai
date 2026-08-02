"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

import { fadeUp } from "./motion";

function Panel({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  tone: "strengths" | "weaknesses";
  empty: string;
}) {
  const isStrength = tone === "strengths";
  const Icon = isStrength ? CheckCircle2 : XCircle;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length > 0 ? (
        <motion.ul
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2"
        >
          {items.map((item) => (
            <motion.li
              key={item}
              variants={fadeUp}
              className="text-muted-foreground flex items-start gap-2 text-sm leading-relaxed"
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isStrength ? "text-emerald-500" : "text-rose-500"
                )}
                aria-hidden="true"
              />
              <span>{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <p className="text-muted-foreground text-sm italic">{empty}</p>
      )}
    </div>
  );
}

export function StrengthWeakness({
  strengths,
  weaknesses,
}: {
  strengths: string[];
  weaknesses: string[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border-border bg-card overflow-hidden rounded-xl p-5 ring-1 ring-foreground/10">
        <Panel
          title="Strengths"
          items={strengths}
          tone="strengths"
          empty="No strengths identified."
        />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-xl p-5 ring-1 ring-foreground/10">
        <Panel
          title="Weaknesses"
          items={weaknesses}
          tone="weaknesses"
          empty="No weaknesses identified — impressive."
        />
      </div>
    </div>
  );
}
