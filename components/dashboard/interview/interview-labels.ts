import type {
  ExperienceLevel,
  InterviewType,
  QuestionCategory,
  QuestionDifficulty,
} from "@/lib/types/interview";

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: "Entry level",
  JUNIOR: "Junior",
  MID: "Mid level",
  SENIOR: "Senior",
  LEAD: "Lead",
};

export const TYPE_LABELS: Record<InterviewType, string> = {
  HR: "HR",
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  MIXED: "Mixed",
};

export function typeTone(type: InterviewType): string {
  switch (type) {
    case "HR":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "TECHNICAL":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
    case "BEHAVIORAL":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  PROJECTS: "Projects",
  RESUME: "Resume",
  PROBLEM_SOLVING: "Problem Solving",
  SYSTEM_DESIGN: "System Design",
};

export function categoryTone(category: QuestionCategory): string {
  switch (category) {
    case "TECHNICAL":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
    case "BEHAVIORAL":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "PROJECTS":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "RESUME":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "PROBLEM_SOLVING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
}

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export function difficultyTone(difficulty: QuestionDifficulty): string {
  switch (difficulty) {
    case "EASY":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "MEDIUM":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}
