import { z } from "zod";

/** Validates the JSON structure returned by the Gemini cover letter step. */
export const coverLetterOutputSchema = z.object({
  content: z.string().catch(""),
});

export type CoverLetterOutput = z.infer<typeof coverLetterOutputSchema>;

/** Shape returned to the client for a saved cover letter. */
export type CoverLetterItem = {
  id: string;
  analysisId: string;
  generatedResumeId: string | null;
  content: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error: string | null;
  modelVersion: string | null;
  createdAt: string;
  updatedAt: string;
  resumeName: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
};
