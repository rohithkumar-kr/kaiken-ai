"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Reveal } from "./motion";
import { SectionHeading } from "./section-heading";

const FAQ_ITEMS = [
  {
    question: "What file formats does Kaiken AI support?",
    answer:
      "We support PDF and DOCX, which covers the formats recruiters and ATS systems most commonly accept. More formats are on the roadmap.",
  },
  {
    question: "How accurate is the ATS score?",
    answer:
      "Our score is built from the same parsing heuristics major ATS platforms use — structure, keyword density, formatting, and readability. It's an accurate signal, not a guarantee, and we tell you exactly what to fix.",
  },
  {
    question: "Can I compare my resume against a specific job description?",
    answer:
      "Yes. Paste any job description and Kaiken AI will score keyword overlap and surface the terms your resume is missing for that exact role.",
  },
  {
    question: "Is my resume data private and secure?",
    answer:
      "Your documents are encrypted in transit and at rest, and they're never used to train shared models. You can delete your data at any time.",
  },
  {
    question: "Do you store my resume permanently?",
    answer:
      "Only if you want us to. Free accounts keep a single resume on file; you can delete it instantly from your dashboard and the data is removed from our systems.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Absolutely. Upgrades and downgrades are instant, and you can cancel in two clicks — no emails, no retention calls.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-3xl px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked questions"
            description="Everything you need to know before you upload your first resume."
          />
        </Reveal>

        <Reveal delay={0.08}>
          <Accordion className="mt-12">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.question}>
                <AccordionTrigger className="py-4 text-base font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
