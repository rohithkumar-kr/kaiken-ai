export type DiffSegment = {
  type: "same" | "added" | "removed";
  text: string;
};

function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

function lcs(a: string[], b: string[]): number[][] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/** Word-level diff between two strings, grouping consecutive tokens by status. */
export function diffText(original: string, updated: string): DiffSegment[] {
  const a = tokenize(original);
  const b = tokenize(updated);
  const dp = lcs(a, b);

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  let buffer = "";
  let type: DiffSegment["type"] = "same";

  function flush() {
    if (!buffer) return;
    segments.push({ type, text: buffer });
    buffer = "";
  }

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      if (type !== "same") {
        flush();
        type = "same";
      }
      buffer += a[i];
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      if (type !== "removed") {
        flush();
        type = "removed";
      }
      buffer += a[i];
      i++;
    } else {
      if (type !== "added") {
        flush();
        type = "added";
      }
      buffer += b[j];
      j++;
    }
  }

  while (i < a.length) {
    if (type !== "removed") {
      flush();
      type = "removed";
    }
    buffer += a[i];
    i++;
  }
  while (j < b.length) {
    if (type !== "added") {
      flush();
      type = "added";
    }
    buffer += b[j];
    j++;
  }
  flush();

  return segments;
}

/** Split a long text into paragraphs so diffs render line by line. */
export function diffParagraphs(original: string | null, updated: string | null): DiffSegment[][] {
  const a = (original ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const b = (updated ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const length = Math.max(a.length, b.length);
  const out: DiffSegment[][] = [];
  for (let index = 0; index < length; index++) {
    out.push(diffText(a[index] ?? "", b[index] ?? ""));
  }
  return out.filter((paragraph) => paragraph.some((segment) => segment.text.trim()));
}

export function matchItems<T>(
  original: T[],
  updated: T[],
  key: (item: T) => string
): { original: T | null; updated: T | null }[] {
  const used = new Set<number>();
  const pairs: { original: T | null; updated: T | null }[] = [];

  for (const item of original) {
    const needle = key(item);
    const matchIndex = updated.findIndex(
      (candidate, index) => !used.has(index) && needle && key(candidate) === needle
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      pairs.push({ original: item, updated: updated[matchIndex] });
    } else {
      pairs.push({ original: item, updated: null });
    }
  }

  updated.forEach((item, index) => {
    if (!used.has(index)) {
      pairs.push({ original: null, updated: item });
    }
  });

  return pairs;
}

type ExperienceItem = {
  title: string;
  company: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

type ProjectItem = {
  name: string;
  description: string | null;
  technologies: string[];
  url: string | null;
  startDate: string | null;
  endDate: string | null;
};

type EducationItem = {
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
};

export function matchExperience(
  original: ExperienceItem[],
  updated: ExperienceItem[]
) {
  return matchItems(original, updated, (item) => `${item.title ?? ""}${item.company ?? ""}`);
}

export function matchProjects(original: ProjectItem[], updated: ProjectItem[]) {
  return matchItems(original, updated, (item) => item.name ?? "");
}

export function matchEducation(original: EducationItem[], updated: EducationItem[]) {
  return matchItems(
    original,
    updated,
    (item) => `${item.institution ?? ""}${item.degree ?? ""}`
  );
}

export function skillStatus(original: string[], updated: string[]) {
  const originalSet = new Set(original.map((skill) => skill.toLowerCase()));
  const updatedSet = new Set(updated.map((skill) => skill.toLowerCase()));

  const added = updated.filter((skill) => !originalSet.has(skill.toLowerCase()));
  const removed = original.filter((skill) => !updatedSet.has(skill.toLowerCase()));

  return { added, removed };
}
