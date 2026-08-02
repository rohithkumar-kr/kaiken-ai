import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Reveal } from "./motion";

export function Hero({ isSignedIn = false }: { isSignedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid bg-grid-fade absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="glow-foreground absolute inset-x-0 top-0 -z-10 h-[28rem]"
        aria-hidden="true"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28 lg:px-8">
        <Reveal>
          <span className="bg-background/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="bg-foreground/60 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-foreground relative inline-flex size-1.5 rounded-full" />
            </span>
            Precision AI Resume Evaluation
          </span>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            <span className="text-gradient">Cut through resume noise</span> with precision AI
            evaluation.
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty">
            Upload your resume, get an ATS compatibility score, compare against job descriptions,
            and land more interviews — in minutes, not weeks.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 gap-2 px-6 text-base"
              )}
            >
              Analyze Resume
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
            <Link
              href="#demo"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-6 text-base"
              )}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              View Demo
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.32}>
          <p className="text-muted-foreground mt-6 text-xs">
            No credit card required · Free to start · Your data stays yours
          </p>
        </Reveal>
      </div>
    </section>
  );
}
