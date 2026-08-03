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

/** Validates the JSON structure returned by the Gemini answer evaluation step. */
export const interviewEvaluationOutputSchema = z.object({
  score: z.number().int().min(0).max(100).catch(0),
  strengths: z.array(z.string().min(1)).catch([]),
  weaknesses: z.array(z.string().min(1)).catch([]),
  suggestions: z.array(z.string().min(1)).catch([]),
  idealAnswer: z.string().catch(""),
});

export type InterviewEvaluationOutput = z.infer<typeof interviewEvaluationOutputSchema>;

/** Shape returned to the client for a persisted answer evaluation. */
export type InterviewEvaluationItem = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  idealAnswer: string;
  modelVersion: string | null;
  evaluatedAt: string;
};

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
  overallScore: number | null;
  completedAt: string | null;
  reportGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Hiring recommendation derived from the overall interview score.
 * `>=90` Strong Hire, `80-89` Hire, `70-79` Consider, `60-69` Needs
 * Improvement, `<60` Not Ready.
 */
export type HiringRecommendation =
  | "STRONG_HIRE"
  | "HIRE"
  | "CONSIDER"
  | "NEEDS_IMPROVEMENT"
  | "NOT_READY";

/** Average evaluation score for one question category. */
export type InterviewReportCategoryScore = {
  category: QuestionCategory;
  score: number;
  questionCount: number;
};

/** One evaluated question in the report breakdown. */
export type InterviewReportQuestion = {
  questionId: string;
  questionNumber: number;
  question: string;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
  expectedDuration: number;
  score: number;
  answer: string;
};

/** Full interview performance report, computed from stored evaluations. */
export type InterviewReport = {
  sessionId: string;
  jobRole: string;
  company: string | null;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  overallScore: number;
  hiringRecommendation: HiringRecommendation;
  categoryScores: InterviewReportCategoryScore[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  questions: InterviewReportQuestion[];
  completedAt: string | null;
  reportGeneratedAt: string | null;
};

/** Validates the payload for auto-saving an interview answer. */
export const interviewAnswerInputSchema = z.object({
  answer: z.string().max(20000, "Answer is too long."),
  startedAt: z.string().datetime().nullish(),
});

export type InterviewAnswerInput = z.infer<typeof interviewAnswerInputSchema>;

/** Shape returned to the client for a saved interview answer. */
export type InterviewAnswerItem = {
  id: string;
  questionId: string;
  sessionId: string;
  answer: string;
  startedAt: string | null;
  evaluation: InterviewEvaluationItem | null;
  createdAt: string;
  updatedAt: string;
};
