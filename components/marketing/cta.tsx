import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Reveal } from "./motion";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Reveal>
          <div className="bg-foreground text-background relative overflow-hidden rounded-2xl border">
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,color-mix(in_oklch,white_14%,transparent),transparent_70%)]"
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center sm:px-16 sm:py-20">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Your next interview is one upload away.
              </h2>
              <p className="max-w-xl text-pretty opacity-80">
                Join thousands of candidates cutting through the noise with precision AI evaluation.
                Free to start.
              </p>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "bg-background text-foreground hover:bg-background/90 mt-2 h-11 gap-2 border-transparent px-6 text-base"
                )}
              >
                Analyze Resume
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
