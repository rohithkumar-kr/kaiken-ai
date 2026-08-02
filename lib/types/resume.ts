import { z } from "zod";

export const experienceSchema = z.object({
  title: z.string().catch(""),
  company: z.string().nullable().catch(null),
  location: z.string().nullable().catch(null),
  startDate: z.string().nullable().catch(null),
  endDate: z.string().nullable().catch(null),
  description: z.string().nullable().catch(null),
});

export const projectSchema = z.object({
  name: z.string().catch(""),
  description: z.string().nullable().catch(null),
  technologies: z.array(z.string()).catch([]),
  url: z.string().nullable().catch(null),
  startDate: z.string().nullable().catch(null),
  endDate: z.string().nullable().catch(null),
});

export const educationSchema = z.object({
  institution: z.string().catch(""),
  degree: z.string().nullable().catch(null),
  fieldOfStudy: z.string().nullable().catch(null),
  startDate: z.string().nullable().catch(null),
  endDate: z.string().nullable().catch(null),
  grade: z.string().nullable().catch(null),
});

export const certificationSchema = z.object({
  name: z.string().catch(""),
  issuer: z.string().nullable().catch(null),
  date: z.string().nullable().catch(null),
  url: z.string().nullable().catch(null),
});

/** Validates the JSON structure returned by the Gemini extraction step. */
export const parsedResumeSchema = z.object({
  name: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
  phone: z.string().nullable().catch(null),
  summary: z.string().nullable().catch(null),
  skills: z.array(z.string()).catch([]),
  experience: z.array(experienceSchema).catch([]),
  projects: z.array(projectSchema).catch([]),
  education: z.array(educationSchema).catch([]),
  certifications: z.array(certificationSchema).catch([]),
});

export type ParsedExperience = z.infer<typeof experienceSchema>;
export type ParsedProject = z.infer<typeof projectSchema>;
export type ParsedEducation = z.infer<typeof educationSchema>;
export type ParsedCertification = z.infer<typeof certificationSchema>;
export type ParsedResumeData = z.infer<typeof parsedResumeSchema>;
