import { Check, Lock } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Reveal } from "./motion";
import { SectionHeading } from "./section-heading";

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string; variant: "default" | "outline" };
  highlighted?: boolean;
  comingSoon?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "For trying Kaiken AI and running your first analysis.",
    features: [
      "1 resume analysis",
      "ATS compatibility score",
      "Basic keyword matching",
      "3 AI suggestions per resume",
    ],
    cta: { label: "Get started", href: "/sign-up", variant: "outline" },
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "/month",
    description: "For active job seekers who want every advantage.",
    features: [
      "Unlimited resume analyses",
      "Job description comparison",
      "AI resume rewriter",
      "Cover letter generator",
      "Advanced keyword matching",
      "Priority support",
    ],
    cta: { label: "Start free trial", href: "/sign-up", variant: "default" },
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Coming soon",
    description: "For career coaches, teams, and high-volume hiring partners.",
    features: [
      "Team workspaces",
      "Custom AI models",
      "API access",
      "SSO & advanced security",
      "Dedicated support",
    ],
    cta: { label: "Contact sales", href: "#", variant: "outline" },
    comingSoon: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Start free. Upgrade when it matters."
            description="Simple, transparent pricing. Cancel anytime — no questions asked."
          />
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.07} className="h-full">
              <div
                className={cn(
                  "bg-background relative flex h-full flex-col rounded-xl border p-6",
                  plan.highlighted && "border-foreground/20 shadow-[0_0_0_1px_var(--foreground)]"
                )}
              >
                {plan.highlighted ? (
                  <span className="bg-foreground text-background absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium">
                    Most popular
                  </span>
                ) : null}

                <h3 className="text-base font-semibold tracking-tight">{plan.name}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  {plan.cadence ? (
                    <span className="text-muted-foreground text-sm">{plan.cadence}</span>
                  ) : null}
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className="text-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex-1" />

                <Link
                  href={plan.cta.href}
                  aria-disabled={plan.comingSoon}
                  className={cn(
                    buttonVariants({
                      variant: plan.cta.variant,
                      size: "default",
                    }),
                    "h-9 w-full",
                    plan.comingSoon && "pointer-events-none opacity-60 [&_svg]:mr-0"
                  )}
                >
                  {plan.comingSoon ? (
                    <Lock className="mr-1.5 size-3.5" data-icon="inline-start" aria-hidden="true" />
                  ) : null}
                  {plan.cta.label}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
