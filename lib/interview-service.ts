import "server-only";

import {
  generateInterviewEvaluation,
  generateInterviewQuestions as generateInterviewQuestionsWithGemini,
  GEMINI_MODEL,
} from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { parsedResumeInclude, toParsedResumeData } from "@/lib/parsed-resume";
import type {
  InterviewAnswerInput,
  InterviewAnswerItem,
  InterviewEvaluationItem,
  InterviewQuestionItem,
  InterviewSessionInput,
  InterviewSessionItem,
} from "@/lib/types/interview";
import type { OptimizedResumeData } from "@/lib/types/optimize";
import type { ParsedResumeData } from "@/lib/types/resume";

function toItem(row: {
  id: string;
  jobRole: string;
  company: string | null;
  experienceLevel: InterviewSessionItem["experienceLevel"];
  interviewType: InterviewSessionItem["interviewType"];
  createdAt: Date;
  updatedAt: Date;
}): InterviewSessionItem {
  return {
    id: row.id,
    jobRole: row.jobRole,
    company: row.company,
    experienceLevel: row.experienceLevel,
    interviewType: row.interviewType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All interview sessions owned by a user, newest first. */
export async function listInterviewSessions(userId: string): Promise<InterviewSessionItem[]> {
  const rows = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toItem);
}

/** Get an interview session owned by a user. Returns `null` when not found (404). */
export async function getInterviewSession(
  userId: string,
  id: string
): Promise<InterviewSessionItem | null> {
  const row = await prisma.interviewSession.findFirst({ where: { id, userId } });
  if (!row) return null;
  return toItem(row);
}

/** Create an interview session owned by a user. */
export async function createInterviewSession(
  userId: string,
  input: InterviewSessionInput
): Promise<InterviewSessionItem> {
  const row = await prisma.interviewSession.create({
    data: {
      userId,
      jobRole: input.jobRole,
      company: input.company?.trim() || null,
      experienceLevel: input.experienceLevel,
      interviewType: input.interviewType,
    },
  });
  return toItem(row);
}

/**
 * Update an interview session owned by a user. Returns `null` when the user
 * does not own a session with the given id (404).
 */
export async function updateInterviewSession(
  userId: string,
  id: string,
  input: InterviewSessionInput
): Promise<InterviewSessionItem | null> {
  const existing = await prisma.interviewSession.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.interviewSession.update({
    where: { id },
    data: {
      jobRole: input.jobRole,
      company: input.company?.trim() || null,
      experienceLevel: input.experienceLevel,
      interviewType: input.interviewType,
    },
  });
  return toItem(row);
}

/**
 * Delete an interview session owned by a user. Returns `false` when the user
 * does not own a session with the given id (404).
 */
export async function deleteInterviewSession(userId: string, id: string): Promise<boolean> {
  const result = await prisma.interviewSession.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

function toQuestionItem(row: {
  id: string;
  sessionId: string;
  questionNumber: number;
  question: string;
  difficulty: InterviewQuestionItem["difficulty"];
  category: InterviewQuestionItem["category"];
  expectedDuration: number;
  createdAt: Date;
}): InterviewQuestionItem {
  return {
    id: row.id,
    sessionId: row.sessionId,
    questionNumber: row.questionNumber,
    question: row.question,
    difficulty: row.difficulty,
    category: row.category,
    expectedDuration: row.expectedDuration,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Interview questions for a session owned by the user, in order. */
export async function listInterviewQuestions(
  userId: string,
  sessionId: string
): Promise<InterviewQuestionItem[]> {
  const rows = await prisma.interviewQuestion.findMany({
    where: { sessionId, session: { userId } },
    orderBy: { questionNumber: "asc" },
  });
  return rows.map(toQuestionItem);
}

/**
 * Generate AI interview questions for a session owned by the user.
 *
 * Loads the interview session, the latest parsed resume, and the latest
 * completed ATS analysis (plus its optimized resume when available), calls
 * Gemini, persists all questions, and returns them. The interview is targeted
 * at the session's own job role and company — never another job description.
 *
 * Generation happens once: if questions already exist they are returned
 * instead of generating again.
 *
 * Returns `null` when the user does not own a session with the given id (404).
 */
export async function generateInterviewQuestions(
  userId: string,
  sessionId: string
): Promise<InterviewQuestionItem[] | null> {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) return null;

  const existing = await prisma.interviewQuestion.findMany({
    where: { sessionId },
    orderBy: { questionNumber: "asc" },
  });
  if (existing.length > 0) return existing.map(toQuestionItem);

  const [resume, analysis] = await Promise.all([
    prisma.resume.findFirst({
      where: { userId, parseStatus: "COMPLETED", parsedResume: { isNot: null } },
      orderBy: { updatedAt: "desc" },
      include: parsedResumeInclude,
    }),
    prisma.analysis.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { analyzedAt: "desc" },
      include: {
        generatedResumes: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, data: true },
        },
      },
    }),
  ]);

  const jobContext = {
    title: session.jobRole,
    company: session.company,
    content: "No job description was provided for this role.",
  };

  let optimizedData: OptimizedResumeData | undefined;
  const latestGenerated = analysis?.generatedResumes[0];
  if (latestGenerated?.data) {
    const candidate = latestGenerated.data as unknown as OptimizedResumeData;
    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray(candidate.experience) &&
      Array.isArray(candidate.skills)
    ) {
      optimizedData = candidate;
    }
  }

  const result = await generateInterviewQuestionsWithGemini({
    resume: resume?.parsedResume ? toParsedResumeData(resume.parsedResume) : EMPTY_RESUME,
    optimized: optimizedData,
    job: jobContext,
    interviewType: session.interviewType,
    experienceLevel: session.experienceLevel,
  });

  await prisma.interviewQuestion.createMany({
    data: result.questions.map((question, index) => ({
      sessionId: session.id,
      questionNumber: index + 1,
      question: question.question,
      difficulty: question.difficulty,
      category: question.category,
      expectedDuration: question.expectedDuration,
    })),
  });

  const created = await prisma.interviewQuestion.findMany({
    where: { sessionId: session.id },
    orderBy: { questionNumber: "asc" },
  });
  return created.map(toQuestionItem);
}

function toEvaluationItem(row: {
  evaluationScore: number | null;
  strengths: unknown;
  weaknesses: unknown;
  suggestions: unknown;
  idealAnswer: string | null;
  evaluationModelVersion: string | null;
  evaluatedAt: Date | null;
}): InterviewEvaluationItem | null {
  if (!row.evaluatedAt || row.evaluationScore === null) return null;
  return {
    score: row.evaluationScore,
    strengths: (row.strengths as unknown as string[] | null) ?? [],
    weaknesses: (row.weaknesses as unknown as string[] | null) ?? [],
    suggestions: (row.suggestions as unknown as string[] | null) ?? [],
    idealAnswer: row.idealAnswer ?? "",
    modelVersion: row.evaluationModelVersion,
    evaluatedAt: row.evaluatedAt.toISOString(),
  };
}

function toAnswerItem(row: {
  id: string;
  questionId: string;
  sessionId: string;
  answer: string;
  startedAt: Date | null;
  evaluationScore: number | null;
  strengths: unknown;
  weaknesses: unknown;
  suggestions: unknown;
  idealAnswer: string | null;
  evaluationModelVersion: string | null;
  evaluatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): InterviewAnswerItem {
  return {
    id: row.id,
    questionId: row.questionId,
    sessionId: row.sessionId,
    answer: row.answer,
    startedAt: row.startedAt?.toISOString() ?? null,
    evaluation: toEvaluationItem(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Interview answers for a session owned by the user, keyed by question. */
export async function listInterviewAnswers(
  userId: string,
  sessionId: string
): Promise<InterviewAnswerItem[]> {
  const rows = await prisma.interviewAnswer.findMany({
    where: { sessionId, session: { userId } },
    orderBy: { updatedAt: "asc" },
  });
  return rows.map(toAnswerItem);
}

/**
 * Upsert the answer for a question in a session owned by the user. Returns
 * `null` when the user does not own a session that contains the question (404).
 */
export async function upsertInterviewAnswer(
  userId: string,
  sessionId: string,
  questionId: string,
  input: InterviewAnswerInput
): Promise<InterviewAnswerItem | null> {
  const question = await prisma.interviewQuestion.findFirst({
    where: { id: questionId, sessionId, session: { userId } },
    select: { id: true },
  });
  if (!question) return null;

  const row = await prisma.interviewAnswer.upsert({
    where: { questionId: question.id },
    update: {
      answer: input.answer,
      ...(input.startedAt ? { startedAt: new Date(input.startedAt) } : {}),
    },
    create: {
      questionId: question.id,
      sessionId,
      userId,
      answer: input.answer,
      ...(input.startedAt ? { startedAt: new Date(input.startedAt) } : {}),
    },
  });
  return toAnswerItem(row);
}

const EMPTY_RESUME: ParsedResumeData = {
  name: null,
  email: null,
  phone: null,
  summary: null,
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};

/**
 * Load the persisted evaluation for one answer in a session owned by the user.
 * Returns `null` when the question does not exist for this session or has not
 * been evaluated yet.
 */
export async function getInterviewAnswerEvaluation(
  userId: string,
  sessionId: string,
  questionId: string
): Promise<InterviewEvaluationItem | null> {
  const answer = await prisma.interviewAnswer.findFirst({
    where: { questionId, sessionId, session: { userId } },
  });
  if (!answer) return null;
  return toEvaluationItem(answer);
}

/**
 * Evaluate one interview answer for a session owned by the user.
 *
 * Loads the session, question, latest parsed resume and job description, calls
 * Gemini, and persists the structured evaluation on the answer row.
 *
 * Generation happens once: if the answer already has an evaluation it is
 * returned instead of generating again.
 *
 * Returns `{ status: "not_found" }` when the user does not own a session that
 * contains the question (404), or `{ status: "empty" }` when the answer has no
 * content to evaluate (400).
 */
export async function evaluateInterviewAnswer(
  userId: string,
  sessionId: string,
  questionId: string
): Promise<
  | { status: "evaluated"; evaluation: InterviewEvaluationItem }
  | { status: "not_found" }
  | { status: "empty" }
> {
  const [session, question, answer] = await Promise.all([
    prisma.interviewSession.findFirst({ where: { id: sessionId, userId } }),
    prisma.interviewQuestion.findFirst({
      where: { id: questionId, sessionId, session: { userId } },
    }),
    prisma.interviewAnswer.findFirst({
      where: { questionId, sessionId, session: { userId } },
    }),
  ]);
  if (!session || !question || !answer) {
    return { status: "not_found" };
  }

  if (!answer.answer.trim()) {
    return { status: "empty" };
  }

  const existing = toEvaluationItem(answer);
  if (existing) {
    return { status: "evaluated", evaluation: existing };
  }

  const resume = await prisma.resume.findFirst({
    where: { userId, parseStatus: "COMPLETED", parsedResume: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    include: parsedResumeInclude,
  });

  const job = {
    title: session.jobRole,
    company: session.company,
    content: "No job description was provided for this role.",
  };

  const evaluation = await generateInterviewEvaluation({
    resume: resume?.parsedResume ? toParsedResumeData(resume.parsedResume) : EMPTY_RESUME,
    job,
    question: {
      question: question.question,
      difficulty: question.difficulty,
      category: question.category,
      expectedDuration: question.expectedDuration,
    },
    answer: answer.answer,
  });

  const updated = await prisma.interviewAnswer.update({
    where: { id: answer.id },
    data: {
      evaluationScore: evaluation.score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      suggestions: evaluation.suggestions,
      idealAnswer: evaluation.idealAnswer,
      evaluationModelVersion: GEMINI_MODEL,
      evaluatedAt: new Date(),
    },
  });

  const persisted = toEvaluationItem(updated);
  if (!persisted) {
    throw new Error("Failed to persist the evaluation.");
  }
  return { status: "evaluated", evaluation: persisted };
}
