import "server-only";

import { createPartFromBase64, GoogleGenAI } from "@google/genai";

import { atsOutputSchema, type AtsOutput } from "@/lib/types/analysis";
import {
  optimizedResumeSchema,
  type OptimizedResumeData,
} from "@/lib/types/optimize";
import { parsedResumeSchema, type ParsedResumeData } from "@/lib/types/resume";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESUME_OUTPUT_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildAtsPrompt(resume, job),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: ATS_OUTPUT_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildOptimizePrompt(resume, job, analysis),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: OPTIMIZE_OUTPUT_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return optimizedResumeSchema.parse(parseJson(rawText));
}
