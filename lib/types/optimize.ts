import { z } from "zod";

import {
  educationSchema,
  experienceSchema,
  projectSchema,
} from "@/lib/types/resume";

export const optimizedResumeSchema = z.object({
  summary: z.string().nullable().catch(null),
  experience: z.array(experienceSchema).catch([]),
  projects: z.array(projectSchema).catch([]),
  skills: z.array(z.string()).catch([]),
  education: z.array(educationSchema).catch([]),
});

export type OptimizedResumeData = z.infer<typeof optimizedResumeSchema>;
