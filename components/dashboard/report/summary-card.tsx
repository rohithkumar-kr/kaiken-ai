"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { fadeUp } from "./motion";

export function SummaryCard({ summary }: { summary: string | null }) {
  return (
    <motion.section
      variants={fadeUp}
      className="border-border bg-card ring-foreground/10 relative overflow-hidden rounded-xl p-6 ring-1"
    >
      <div aria-hidden="true" className="bg-primary/5 absolute inset-0" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-4" aria-hidden="true" />
          <h2 className="text-xs font-semibold tracking-widest uppercase">AI Summary</h2>
        </div>
        <p className="mt-3 max-w-prose text-lg leading-relaxed tracking-tight">
          {summary ?? "No summary available for this analysis."}
        </p>
      </div>
    </motion.section>
  );
}
