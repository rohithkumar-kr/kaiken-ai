import "server-only";

import { prisma } from "@/lib/db";
import type { JobDescriptionInput, JobDescriptionItem } from "@/lib/types/job-description";

function toItem(row: {
  id: string;
  title: string;
  company: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): JobDescriptionItem {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All job descriptions owned by a user, newest first. */
export async function listJobDescriptions(userId: string): Promise<JobDescriptionItem[]> {
  const rows = await prisma.jobDescription.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toItem);
}

/** Create a job description owned by a user. */
export async function createJobDescription(
  userId: string,
  input: JobDescriptionInput
): Promise<JobDescriptionItem> {
  const row = await prisma.jobDescription.create({
    data: {
      userId,
      title: input.title,
      company: input.company?.trim() || null,
      content: input.content,
    },
  });
  return toItem(row);
}

/**
 * Update a job description owned by a user. Returns `null` when the user does
 * not own a job description with the given id (404).
 */
export async function updateJobDescription(
  userId: string,
  id: string,
  input: JobDescriptionInput
): Promise<JobDescriptionItem | null> {
  const existing = await prisma.jobDescription.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.jobDescription.update({
    where: { id },
    data: {
      title: input.title,
      company: input.company?.trim() || null,
      content: input.content,
    },
  });
  return toItem(row);
}

/**
 * Delete a job description owned by a user. Returns `false` when the user does
 * not own a job description with the given id (404).
 */
export async function deleteJobDescription(userId: string, id: string): Promise<boolean> {
  const result = await prisma.jobDescription.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
