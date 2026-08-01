import { FileText, FileSearch, ListChecks, PenLine, ScanSearch, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "./motion";
import { SectionHeading } from "./section-heading";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: ScanSearch,
    title: "ATS Score",
    description:
      "A precise compatibility score that tells you exactly how your resume performs against the systems recruiters actually use.",
  },
  {
    icon: FileSearch,
    title: "Resume Analysis",
    description:
      "Deep structural analysis of layout, formatting, and content so nothing silently gets filtered out before a human sees it.",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions",
    description:
      "Actionable, line-by-line suggestions powered by precision AI — not generic tips you've read a hundred times.",
  },
  {
    icon: ListChecks,
    title: "Keyword Matching",
    description:
      "Compare your resume against a target job description and see exactly which keywords you're missing.",
  },
  {
    icon: PenLine,
    title: "Resume Rewriter",
    description:
      "Rewrite bullets to be crisp, quantified, and achievement-first — tailored to the role you're targeting.",
  },
  {
    icon: FileText,
    title: "Cover Letter Generator",
    description:
      "Generate a matching, on-brand cover letter from your resume and the job description in seconds.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to get past the filters"
            description="One platform to analyze, score, rewrite, and ship a resume that performs."
          />
        </Reveal>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.07} className="h-full">
              <div className="group bg-background hover:bg-muted/40 h-full rounded-xl border p-6 transition-colors">
                <div className="bg-muted/50 group-hover:bg-foreground group-hover:text-background flex size-10 items-center justify-center rounded-lg border transition-colors">
                  <feature.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
