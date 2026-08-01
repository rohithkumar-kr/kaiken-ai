import { Reveal } from "./motion";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    step: "01",
    title: "Upload Resume",
    description: "Drop in your PDF or DOCX. We parse it instantly — no templates to fight.",
  },
  {
    step: "02",
    title: "AI Analysis",
    description: "Precision AI reads your content, structure, and formatting end to end.",
  },
  {
    step: "03",
    title: "ATS Score",
    description: "Get a clear compatibility score against the systems employers use.",
  },
  {
    step: "04",
    title: "Improvement Suggestions",
    description: "Line-by-line fixes for keywords, impact, and clarity — prioritized for you.",
  },
  {
    step: "05",
    title: "Download Optimized Resume",
    description: "Export a clean, ATS-safe resume that's ready to send in one click.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/30 scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From upload to optimized resume in five steps"
            description="No guesswork. No fluff. Just a clear path from raw resume to interview-ready."
          />
        </Reveal>

        <ol className="mt-16 grid gap-8 md:grid-cols-5 md:gap-4">
          {STEPS.map((item, i) => (
            <Reveal key={item.step} delay={i * 0.07} className="h-full">
              <li className="relative h-full md:text-center">
                <div className="flex items-center gap-4 md:flex-col md:items-center">
                  <span className="bg-background grid size-11 shrink-0 place-items-center rounded-full border font-mono text-sm font-medium tabular-nums">
                    {item.step}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className="bg-border h-px flex-1 md:hidden" aria-hidden="true" />
                  ) : null}
                </div>
                <div className="mt-4 md:px-1">
                  <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
