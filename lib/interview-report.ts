import type {
  ExperienceLevel,
  HiringRecommendation,
  InterviewReportCategoryScore,
  InterviewType,
  QuestionCategory,
  QuestionDifficulty,
} from "@/lib/types/interview";

/** Stable display order for category scores (spec: Technical, Projects, Behavioral, Resume, Problem Solving, System Design). */
export const REPORT_CATEGORY_ORDER: QuestionCategory[] = [
  "TECHNICAL",
  "PROJECTS",
  "BEHAVIORAL",
  "RESUME",
  "PROBLEM_SOLVING",
  "SYSTEM_DESIGN",
];

export const REPORT_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  PROJECTS: "Projects",
  RESUME: "Resume",
  PROBLEM_SOLVING: "Problem Solving",
  SYSTEM_DESIGN: "System Design",
};

export const REPORT_DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const REPORT_EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: "Entry level",
  JUNIOR: "Junior",
  MID: "Mid level",
  SENIOR: "Senior",
  LEAD: "Lead",
};

export const REPORT_TYPE_LABELS: Record<InterviewType, string> = {
  HR: "HR",
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  MIXED: "Mixed",
};

export const HIRING_RECOMMENDATION_LABELS: Record<HiringRecommendation, string> = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  CONSIDER: "Consider",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  NOT_READY: "Not Ready",
};

/**
 * Hiring recommendation for an overall interview score.
 * `>=90` Strong Hire, `80-89` Hire, `70-79` Consider, `60-69` Needs
 * Improvement, `<60` Not Ready.
 */
export function hiringRecommendation(score: number): HiringRecommendation {
  if (score >= 90) return "STRONG_HIRE";
  if (score >= 80) return "HIRE";
  if (score >= 70) return "CONSIDER";
  if (score >= 60) return "NEEDS_IMPROVEMENT";
  return "NOT_READY";
}

function sentenceCase(value: string): string {
  const trimmed = value.trim().replace(/\.+$/, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Deterministic interview summary built from the computed scores — no AI.
 * Mentions the overall result, strongest/weakest categories, and the most
 * recurring strength and weakness across evaluated answers.
 */
export function buildInterviewSummary(input: {
  overallScore: number;
  hiringLabel: string;
  categoryScores: InterviewReportCategoryScore[];
  strengths: string[];
  weaknesses: string[];
}): string {
  const sentences: string[] = [];
  sentences.push(
    `Your overall score is ${input.overallScore}/100, rated as "${input.hiringLabel}".`
  );

  const top = input.categoryScores[0];
  const bottom = input.categoryScores[input.categoryScores.length - 1];
  if (top && bottom && top.category !== bottom.category) {
    sentences.push(
      `You performed best in ${REPORT_CATEGORY_LABELS[top.category]}, averaging ${top.score}%, and focused work is recommended in ${REPORT_CATEGORY_LABELS[bottom.category]}, where you averaged ${bottom.score}%.`
    );
  } else if (top) {
    sentences.push(
      `You performed strongest in ${REPORT_CATEGORY_LABELS[top.category]}, averaging ${top.score}%.`
    );
  }

  if (input.strengths[0]) {
    sentences.push(`Notable strengths included ${sentenceCase(input.strengths[0])}.`);
  }
  if (input.weaknesses[0]) {
    const weakness = sentenceCase(input.weaknesses[0]);
    sentences.push(
      `Areas to work on included ${weakness.charAt(0).toLowerCase() + weakness.slice(1)}.`
    );
  }

  return sentences.join(" ");
}
