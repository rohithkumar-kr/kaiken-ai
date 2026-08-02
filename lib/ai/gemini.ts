import "server-only";

import { createPartFromBase64, GoogleGenAI } from "@google/genai";

import { atsOutputSchema, type AtsOutput } from "@/lib/types/analysis";
import { coverLetterOutputSchema } from "@/lib/types/cover-letter";
import {
  optimizedResumeSchema,
  type OptimizedResumeData,
} from "@/lib/types/optimize";
import { parsedResumeSchema, type ParsedResumeData } from "@/lib/types/resume";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

const GEMINI_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "models/gemini-flash-latest",
  "models/gemini-2.0-flash",
].filter((model, index, all) => all.indexOf(model) === index);

type GeminiError = {
  status?: number;
  message?: string;
};

function toGeminiError(error: unknown): GeminiError {
  if (typeof error === "object" && error !== null) {
    return error as GeminiError;
  }
  return {};
}

/**
 * Decide whether a failed model attempt should be retried with the next model
 * in the list. Only transient availability problems trigger a retry:
 * - 429 RESOURCE_EXHAUSTED (quota / rate limit)
 * - 404 NOT_FOUND (deprecated or unavailable model)
 * - 503 UNAVAILABLE (transient service outage)
 *
 * Everything else (400/401/403 auth or request errors, malformed responses,
 * schema/validation failures) is NOT retried and propagates immediately.
 */
function shouldTryNextModel(error: unknown): boolean {
  const { status } = toGeminiError(error);
  if (status === 429 || status === 404 || status === 503) {
    return true;
  }
  return false;
}

function formatFailureReason(error: unknown): string {
  const { status, message } = toGeminiError(error);
  if (status == null) {
    return String(error ?? "unknown error");
  }
  return `${status} ${message ?? ""}`.trim();
}

async function generateWithFallback<T>(
  run: (model: string) => Promise<T>
): Promise<T> {
  const failures: Array<{ model: string; error: unknown }> = [];
  let lastError: unknown;

  for (const model of GEMINI_MODELS) {
    console.log(`[Gemini] Trying model ${model}`);
    try {
      const result = await run(model);
      console.log(`[Gemini] Success using ${model}`);
      return result;
    } catch (error) {
      lastError = error;
      failures.push({ model, error });
      if (shouldTryNextModel(error)) {
        const { status } = toGeminiError(error);
        if (status === 404) {
          console.log(`[Gemini] Model unavailable (404). Trying next...`);
        } else if (status === 503) {
          console.log(`[Gemini] Service unavailable (503). Trying next...`);
        } else {
          console.log(`[Gemini] Quota exhausted (429). Trying next...`);
        }
        continue;
      }
      throw error;
    }
  }

  console.error("[Gemini] All models exhausted. Attempts:");
  for (const failure of failures) {
    console.error(
      `[Gemini]   ${failure.model} -> ${formatFailureReason(failure.error)}`
    );
  }
  throw lastError;
}

const RESUME_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          company: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          technologies: { type: "array", items: { type: "string" } },
          url: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: ["string", "null"] },
          degree: { type: ["string", "null"] },
          fieldOfStudy: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          grade: { type: ["string", "null"] },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: ["string", "null"] },
          issuer: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          url: { type: ["string", "null"] },
        },
      },
    },
  },
  required: ["skills", "experience", "projects", "education", "certifications"],
} as const;

function buildPrompt(text: string, hasPdf: boolean): string {
  const lines = [
    hasPdf
      ? "You are an expert resume parser. Analyze the attached PDF resume and extract structured information from it."
      : "You are an expert resume parser. Extract structured information from the resume text below.",
    "",
    "Rules:",
    "- Return ONLY valid JSON matching the provided schema.",
    '- For "skills", return a flat array of individual skill names (e.g. "React", "TypeScript").',
    '- For "experience"/"projects"/"education"/"certifications", preserve original order.',
    "- Use JSON null for any field that is not present. Do not invent information.",
    '- Never use placeholder text such as "..." or "N/A" — use null or an empty array instead.',
    "- Keep descriptions concise but faithful to the source.",
    "- Use ISO date strings (YYYY-MM) when a month/year is available, otherwise the text as-is.",
  ];
  if (text.trim()) {
    lines.push("", "Reference text extracted from the PDF (may be incomplete):", "```", text.slice(0, 60_000), "```");
  }
  return lines.join("\n");
}

function getGenAi(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your environment to run AI parsing.");
  }
  return new GoogleGenAI({ apiKey });
}

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Gemini returned an unparseable JSON response");
  }
}

/**
 * Send resume content to Gemini and receive a validated, structured resume object.
 *
 * When `pdfBuffer` is provided (PDF uploads), the original PDF is attached to the
 * request so Gemini can read it directly. This is more reliable than relying on
 * text extraction, especially for scanned or image-based PDFs.
 */
export async function extractStructuredResume(
  text: string,
  pdfBuffer?: Buffer
): Promise<ParsedResumeData> {
  const ai = getGenAi();

  const parts = pdfBuffer
    ? [
        { text: buildPrompt(text, true) },
        createPartFromBase64(pdfBuffer.toString("base64"), "application/pdf"),
      ]
    : [{ text: buildPrompt(text, false) }];

  const response = await generateWithFallback((model) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESUME_OUTPUT_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    })
  );

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return parsedResumeSchema.parse(parseJson(rawText));
}

const ATS_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    atsScore: { type: "integer" },
    formatScore: { type: "integer" },
    keywordScore: { type: "integer" },
    contentScore: { type: "integer" },
    summary: { type: ["string", "null"] },
    matchedKeywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          importance: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          count: { type: "integer" },
          section: { type: ["string", "null"] },
        },
      },
    },
    missingKeywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          importance: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["CONTENT", "KEYWORD", "FORMAT", "ACTION"] },
          section: { type: ["string", "null"] },
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          title: { type: "string" },
          description: { type: "string" },
          aiRewrite: { type: ["string", "null"] },
        },
      },
    },
  },
  required: [
    "atsScore",
    "formatScore",
    "keywordScore",
    "contentScore",
    "summary",
    "matchedKeywords",
    "missingKeywords",
    "strengths",
    "weaknesses",
    "suggestions",
  ],
} as const;

function buildAtsPrompt(
  resume: ParsedResumeData,
  job: { title: string; company: string | null; content: string }
): string {
  return [
    "You are an expert ATS (Applicant Tracking System) resume analyst.",
    "Assess how well the candidate's parsed resume matches the target job description, then return a structured ATS report.",
    "",
    "Rules:",
    "- Scores are integers from 0 to 100. atsScore is the overall match; formatScore, keywordScore and contentScore rate those specific areas.",
    "- matchedKeywords: relevant keywords from the job description that appear in the resume. Include the resume section where each was found and an approximate count.",
    "- missingKeywords: important keywords from the job description that are missing from the resume.",
    "- strengths and weaknesses: concise, evidence-based bullet points grounded only in the resume content.",
    "- suggestions: specific, actionable improvements. type is CONTENT, KEYWORD, FORMAT or ACTION; severity is HIGH, MEDIUM or LOW.",
    "- Do not invent experience, skills, credentials or companies that are not in the resume.",
    "",
    "Target job description:",
    `Title: ${job.title}`,
    job.company ? `Company: ${job.company}` : "Company: n/a",
    "```",
    job.content,
    "```",
    "",
    "Candidate parsed resume:",
    "```json",
    JSON.stringify(resume),
    "```",
  ].join("\n");
}

/**
 * Send the parsed resume and a target job description to Gemini and receive a
 * validated ATS assessment (scores, keywords, strengths, weaknesses, suggestions).
 */
export async function analyzeResumeForJob(
  resume: ParsedResumeData,
  job: { title: string; company: string | null; content: string }
): Promise<AtsOutput> {
  const ai = getGenAi();

  const response = await generateWithFallback((model) =>
    ai.models.generateContent({
      model,
      contents: buildAtsPrompt(resume, job),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: ATS_OUTPUT_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    })
  );

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return atsOutputSchema.parse(parseJson(rawText));
}

const OPTIMIZE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: ["string", "null"] },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          company: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["title", "company", "location", "startDate", "endDate", "description"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          technologies: { type: "array", items: { type: "string" } },
          url: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
        },
        required: ["name", "description", "technologies", "url", "startDate", "endDate"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: ["string", "null"] },
          degree: { type: ["string", "null"] },
          fieldOfStudy: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          grade: { type: ["string", "null"] },
        },
        required: ["institution", "degree", "fieldOfStudy", "startDate", "endDate", "grade"],
      },
    },
  },
  required: ["summary", "experience", "projects", "skills", "education"],
} as const;

function buildOptimizePrompt(
  resume: ParsedResumeData,
  job: { title: string; company: string | null; content: string },
  analysis: AtsOutput
): string {
  const missing = analysis.missingKeywords.map((keyword) => keyword.keyword);
  return [
    "You are an expert resume optimizer. Rewrite the candidate's parsed resume so it scores higher against the target job description while staying completely truthful.",
    "",
    "Rules:",
    "- NEVER invent information. Never fabricate experience, employers, schools, dates, or credentials that are not in the original resume.",
    "- NEVER create fake projects or fake companies.",
    "- Improve the resume naturally: sharpen wording, reorder for impact, and use stronger, concrete language.",
    "- Insert missing keywords from the job description naturally where they genuinely fit the candidate's background. Do not stuff keywords.",
    "- Keep every real fact intact: names of employers, schools, dates, and accomplishments must not be changed.",
    "- Keep descriptions concise, professional, and truthful.",
    "- Return ONLY valid JSON matching the provided schema.",
    "",
    "Target job description:",
    `Title: ${job.title}`,
    job.company ? `Company: ${job.company}` : "Company: n/a",
    "```",
    job.content,
    "```",
    "",
    "Missing keywords from the ATS analysis that should be woven in where they fit:",
    missing.length > 0 ? missing.map((keyword) => `- ${keyword}`).join("\n") : "- (none)",
    "",
    "Candidate parsed resume:",
    "```json",
    JSON.stringify(resume),
    "```",
  ].join("\n");
}

/**
 * Rewrite a parsed resume against a target job description using the ATS
 * analysis (missing keywords, suggestions) as guidance. Returns the optimized
 * resume as structured sections (summary, experience, projects, skills, education).
 */
export async function optimizeResumeForJob(
  resume: ParsedResumeData,
  job: { title: string; company: string | null; content: string },
  analysis: AtsOutput
): Promise<OptimizedResumeData> {
  const ai = getGenAi();

  const response = await generateWithFallback((model) =>
    ai.models.generateContent({
      model,
      contents: buildOptimizePrompt(resume, job, analysis),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: OPTIMIZE_OUTPUT_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    })
  );

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return optimizedResumeSchema.parse(parseJson(rawText));
}

const COVER_LETTER_SCHEMA = {
  type: "object",
  properties: {
    content: { type: "string" },
  },
  required: ["content"],
} as const;

function buildCoverLetterPrompt(input: {
  resume: ParsedResumeData;
  optimized?: OptimizedResumeData;
  job: { title: string; company: string | null; content: string };
  analysis: AtsOutput;
}): string {
  return [
    "You are an expert career coach and professional writer. Write a personalized cover letter for the candidate applying to the job below.",
    "",
    "Rules:",
    "- NEVER invent experience, projects, companies, education, credentials, or skills that are not present in the candidate's resume.",
    "- Mention only real skills from the resume.",
    "- Personalize the letter for the target company and role.",
    "- Keep the cover letter under one A4 page (approximately 300–450 words).",
    "- Use a warm, professional tone. Start with a formal salutation (e.g. \"Dear Hiring Manager,\") and end with a formal closing (e.g. \"Sincerely,\") followed by the candidate's name.",
    "- Do not include the candidate's contact details or a date — those are added separately.",
    "- Return ONLY the letter body in the `content` field, as plain paragraphs separated by single blank lines.",
    "",
    "Target job description:",
    `Title: ${input.job.title}`,
    input.job.company ? `Company: ${input.job.company}` : "Company: n/a",
    "```",
    input.job.content,
    "```",
    "",
    "Candidate resume:",
    "```json",
    JSON.stringify(input.resume),
    "```",
    "",
    input.optimized
      ? [
          "Optimized version of the candidate's resume (use it to phrase experience and skills strongly, but still only use real facts):",
          "```json",
          JSON.stringify(input.optimized),
          "```",
        ].join("\n")
      : null,
    "",
    "ATS analysis of the candidate's resume against this job:",
    "```json",
    JSON.stringify({
      summary: input.analysis.summary,
      atsScore: input.analysis.atsScore,
      matchedKeywords: input.analysis.matchedKeywords,
      missingKeywords: input.analysis.missingKeywords,
      strengths: input.analysis.strengths,
    }),
    "```",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Generate a personalized cover letter for a candidate applying to a job, using
 * the parsed (and optionally optimized) resume plus the ATS analysis as context.
 * Returns the letter body as plain text with paragraphs separated by blank lines.
 */
export async function generateCoverLetter(input: {
  resume: ParsedResumeData;
  optimized?: OptimizedResumeData;
  job: { title: string; company: string | null; content: string };
  analysis: AtsOutput;
}): Promise<string> {
  const ai = getGenAi();

  const response = await generateWithFallback((model) =>
    ai.models.generateContent({
      model,
      contents: buildCoverLetterPrompt(input),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: COVER_LETTER_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })
  );

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  let parsedJson: unknown;
  try {
    parsedJson = parseJson(rawText);
  } catch (error) {
    console.error(
      "[generateCoverLetter] Gemini returned invalid JSON. Raw response:",
      rawText
    );
    throw error;
  }

  const parsed = coverLetterOutputSchema.parse(parsedJson);
  const content = parsed.content.trim();
  if (!content) {
    console.error(
      "[generateCoverLetter] Gemini returned an empty cover letter. Raw response:",
      rawText
    );
    throw new Error("Gemini returned an empty cover letter");
  }
  return content;
}
