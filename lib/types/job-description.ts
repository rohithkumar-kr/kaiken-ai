import { z } from "zod";

/** Validates the payload for creating/updating a saved job description. */
export const jobDescriptionInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  company: z.string().trim().max(200, "Company name is too long.").nullable().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Job description is required.")
    .max(20_000, "Job description is too long."),
});

export type JobDescriptionInput = z.infer<typeof jobDescriptionInputSchema>;

/** Shape returned to the client for a saved job description. */
export type JobDescriptionItem = {
  id: string;
  title: string;
  company: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};
