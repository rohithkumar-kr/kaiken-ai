import { z } from "zod";

export const interviewTypeSchema = z.enum(["HR", "TECHNICAL", "BEHAVIORAL", "MIXED"]);
export const experienceLevelSchema = z.enum(["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD"]);

/** Validates the payload for creating/updating an interview session. */
export const interviewSessionInputSchema = z.object({
  jobRole: z.string().trim().min(1, "Job role is required.").max(200, "Job role is too long."),
  company: z.string().trim().max(200, "Company name is too long.").nullable().optional(),
  experienceLevel: experienceLevelSchema,
  interviewType: interviewTypeSchema,
});

export type InterviewSessionInput = z.infer<typeof interviewSessionInputSchema>;
export type InterviewType = z.infer<typeof interviewTypeSchema>;
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const questionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const questionCategorySchema = z.enum([
  "TECHNICAL",
  "BEHAVIORAL",
  "PROJECTS",
  "RESUME",
  "PROBLEM_SOLVING",
  "SYSTEM_DESIGN",
]);

export type QuestionDifficulty = z.infer<typeof questionDifficultySchema>;
export type QuestionCategory = z.infer<typeof questionCategorySchema>;

/** Validates the JSON structure returned by the Gemini question generation step. */
export const interviewQuestionsOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        difficulty: questionDifficultySchema,
        category: questionCategorySchema,
        expectedDuration: z.number().int().min(2).max(10),
      })
    )
    .min(1),
});

export type InterviewQuestionsOutput = z.infer<typeof interviewQuestionsOutputSchema>;

/** Shape returned to the client for a saved interview question. */
export type InterviewQuestionItem = {
  id: string;
  sessionId: string;
  questionNumber: number;
  question: string;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
  expectedDuration: number;
  createdAt: string;
};

/** Shape returned to the client for a saved interview session. */
export type InterviewSessionItem = {
  id: string;
  jobRole: string;
  company: string | null;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  createdAt: string;
  updatedAt: string;
};
