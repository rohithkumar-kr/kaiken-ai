import { z } from "zod";

export const keywordImportanceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const atsOutputSchema = z.object({
  atsScore: z.number().int().min(0).max(100).catch(0),
  formatScore: z.number().int().min(0).max(100).catch(0),
  keywordScore: z.number().int().min(0).max(100).catch(0),
  contentScore: z.number().int().min(0).max(100).catch(0),
  summary: z.string().nullable().catch(null),
  matchedKeywords: z
    .array(
      z.object({
        keyword: z.string().catch(""),
        importance: keywordImportanceSchema.catch("LOW"),
        count: z.number().int().min(0).catch(0),
        section: z.string().nullable().catch(null),
      })
    )
    .catch([]),
  missingKeywords: z
    .array(
      z.object({
        keyword: z.string().catch(""),
        importance: keywordImportanceSchema.catch("LOW"),
      })
    )
    .catch([]),
  strengths: z.array(z.string()).catch([]),
  weaknesses: z.array(z.string()).catch([]),
  suggestions: z
    .array(
      z.object({
        type: z.enum(["CONTENT", "KEYWORD", "FORMAT", "ACTION"]).catch("ACTION"),
        section: z.string().nullable().catch(null),
        severity: keywordImportanceSchema.catch("LOW"),
        title: z.string().catch(""),
        description: z.string().catch(""),
        aiRewrite: z.string().nullable().catch(null),
      })
    )
    .catch([]),
});

export type AtsOutput = z.infer<typeof atsOutputSchema>;
export type AtsKeyword = z.infer<typeof atsOutputSchema>["matchedKeywords"][number];
export type AtsSuggestion = z.infer<typeof atsOutputSchema>["suggestions"][number];
