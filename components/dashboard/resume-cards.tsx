import type { LucideIcon } from "lucide-react";
import { Award, Briefcase, FolderKanban, GraduationCap, Sparkles, User } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParsedResumeData } from "@/lib/types/resume";

function SectionCard({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-muted/50 grid size-8 place-items-center rounded-md border">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground/60 text-sm italic">{children}</p>;
}

function DateRange({ start, end }: { start?: string | null; end?: string | null }) {
  if (!start && !end) return null;
  return (
    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
      {start ?? "?"} — {end ?? "Present"}
    </span>
  );
}

function ListItem({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  children?: ReactNode;
}) {
  return (
    <li className="border-border flex flex-col gap-1 border-l-2 pl-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </div>
        {meta ? <span className="text-muted-foreground shrink-0 text-xs">{meta}</span> : null}
      </div>
      {children}
    </li>
  );
}

export function ResumeCards({ data }: { data: ParsedResumeData }) {
  const hasExperience = data.experience.length > 0;
  const hasProjects = data.projects.length > 0;
  const hasEducation = data.education.length > 0;
  const hasCertifications = data.certifications.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard icon={User} title="Personal Info" className="md:col-span-2">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">Name</dt>
            <dd className="mt-1 text-sm font-medium">{data.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">Email</dt>
            <dd className="mt-1 text-sm">{data.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase">Phone</dt>
            <dd className="mt-1 text-sm">{data.phone ?? "—"}</dd>
          </div>
        </dl>
        {data.summary ? (
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{data.summary}</p>
        ) : null}
      </SectionCard>

      <SectionCard icon={Sparkles} title="Skills">
        {data.skills.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <li
                key={skill}
                className="bg-muted/50 rounded-full border px-3 py-1 text-xs font-medium"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyText>No skills detected.</EmptyText>
        )}
      </SectionCard>

      <SectionCard icon={Briefcase} title="Experience">
        {hasExperience ? (
          <ul className="flex flex-col gap-4">
            {data.experience.map((item, i) => (
              <ListItem
                key={`${item.title}-${item.company}-${i}`}
                title={item.title || "Untitled role"}
                subtitle={[item.company, item.location].filter(Boolean).join(" · ") || null}
              >
                <DateRange start={item.startDate} end={item.endDate} />
                {item.description ? (
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                ) : null}
              </ListItem>
            ))}
          </ul>
        ) : (
          <EmptyText>No experience detected.</EmptyText>
        )}
      </SectionCard>

      <SectionCard icon={FolderKanban} title="Projects">
        {hasProjects ? (
          <ul className="flex flex-col gap-4">
            {data.projects.map((item, i) => (
              <ListItem
                key={`${item.name}-${i}`}
                title={item.name || "Untitled project"}
                subtitle={item.technologies?.join(", ") || null}
              >
                <DateRange start={item.startDate} end={item.endDate} />
                {item.description ? (
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                ) : null}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground hover:text-muted-foreground mt-1 inline-flex text-sm underline underline-offset-3"
                  >
                    {item.url}
                  </a>
                ) : null}
              </ListItem>
            ))}
          </ul>
        ) : (
          <EmptyText>No projects detected.</EmptyText>
        )}
      </SectionCard>

      <SectionCard icon={GraduationCap} title="Education">
        {hasEducation ? (
          <ul className="flex flex-col gap-4">
            {data.education.map((item, i) => (
              <ListItem
                key={`${item.institution}-${i}`}
                title={item.institution || "Institution"}
                subtitle={[item.degree, item.fieldOfStudy].filter(Boolean).join(" · ") || null}
                meta={item.grade ?? undefined}
              >
                <DateRange start={item.startDate} end={item.endDate} />
              </ListItem>
            ))}
          </ul>
        ) : (
          <EmptyText>No education detected.</EmptyText>
        )}
      </SectionCard>

      <SectionCard icon={Award} title="Certifications">
        {hasCertifications ? (
          <ul className="flex flex-col gap-4">
            {data.certifications.map((item, i) => (
              <ListItem
                key={`${item.name}-${i}`}
                title={item.name || "Certification"}
                subtitle={item.issuer ?? null}
                meta={item.date ?? undefined}
              >
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground hover:text-muted-foreground mt-1 inline-flex text-sm underline underline-offset-3"
                  >
                    {item.url}
                  </a>
                ) : null}
              </ListItem>
            ))}
          </ul>
        ) : (
          <EmptyText>No certifications detected.</EmptyText>
        )}
      </SectionCard>
    </div>
  );
}
