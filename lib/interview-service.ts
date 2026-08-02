import "server-only";

import { generateInterviewQuestions as generateInterviewQuestionsWithGemini } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";
import { parsedResumeInclude, toParsedResumeData } from "@/lib/parsed-resume";
import type {
  InterviewAnswerInput,
  InterviewAnswerItem,
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
 * Loads the interview session, the latest parsed resume, the latest completed
 * ATS analysis (plus its optimized resume when available) and the job
 * description, calls Gemini, persists all questions, and returns them.
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

  const [resume, analysis, latestJob] = await Promise.all([
    prisma.resume.findFirst({
      where: { userId, parseStatus: "COMPLETED", parsedResume: { isNot: null } },
      orderBy: { updatedAt: "desc" },
      include: parsedResumeInclude,
    }),
    prisma.analysis.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { analyzedAt: "desc" },
      include: {
        jobDescription: { select: { title: true, company: true, content: true } },
        generatedResumes: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, data: true },
        },
      },
    }),
    prisma.jobDescription.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { title: true, company: true, content: true },
    }),
  ]);

  const job = analysis?.jobDescription ?? latestJob;
  const jobContext = {
    title: job?.title ?? session.jobRole,
    company: job?.company ?? session.company,
    content: job?.content ?? "No job description was provided for this role.",
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

function toAnswerItem(row: {
  id: string;
  questionId: string;
  sessionId: string;
  answer: string;
  startedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): InterviewAnswerItem {
  return {
    id: row.id,
    questionId: row.questionId,
    sessionId: row.sessionId,
    answer: row.answer,
    startedAt: row.startedAt?.toISOString() ?? null,
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
