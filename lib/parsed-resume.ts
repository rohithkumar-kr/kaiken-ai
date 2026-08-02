import type { ParsedResumeData } from "@/lib/types/resume";

export const parsedResumeInclude = {
  parsedResume: {
    include: {
      skills: { orderBy: { order: "asc" } },
      experiences: { orderBy: { order: "asc" } },
      projects: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
    },
  },
} as const;

export type ParsedResumeRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: { name: string }[];
  experiences: {
    title: string;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }[];
  projects: {
    name: string;
    description: string | null;
    technologies: unknown;
    url: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];
  educations: {
    institution: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    grade: string | null;
  }[];
  certifications: {
    name: string;
    issuer: string | null;
    date: string | null;
    url: string | null;
  }[];
};

export function toParsedResumeData(parsed: ParsedResumeRow): ParsedResumeData {
  return {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    summary: parsed.summary,
    skills: parsed.skills.map((skill) => skill.name),
    experience: parsed.experiences.map((item) => ({
      title: item.title,
      company: item.company,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate,
      description: item.description,
    })),
    projects: parsed.projects.map((item) => ({
      name: item.name,
      description: item.description,
      technologies: (item.technologies ?? []) as string[],
      url: item.url,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    education: parsed.educations.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate,
      endDate: item.endDate,
      grade: item.grade,
    })),
    certifications: parsed.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      url: item.url,
    })),
  };
}
