import { Box, Command, Hexagon, Layers, Orbit, Triangle } from "lucide-react";

import { Reveal } from "./motion";

const COMPANIES = [
  { name: "Acme", icon: Triangle },
  { name: "Northwind", icon: Command },
  { name: "Globex", icon: Hexagon },
  { name: "Initech", icon: Box },
  { name: "Hooli", icon: Orbit },
  { name: "Umbrella", icon: Layers },
];

export function TrustedBy() {
  return (
    <section className="bg-muted/30 border-y">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 py-14 lg:px-8">
        <Reveal>
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Trusted by hiring teams at
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="grid w-full grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {COMPANIES.map((company) => (
              <li
                key={company.name}
                className="text-muted-foreground/70 hover:text-foreground flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <company.icon className="size-4" aria-hidden="true" />
                {company.name}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
