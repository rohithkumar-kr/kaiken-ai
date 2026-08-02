import "server-only";

import { GoogleGenAI } from "@google/genai";

import { parsedResumeSchema, type ParsedResumeData } from "@/lib/types/resume";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

const RESUME_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          technologies: { type: "array", items: { type: "string" } },
          url: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
        },
        required: ["name"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          fieldOfStudy: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          grade: { type: "string" },
        },
        required: ["institution"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
          url: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  required: [
    "name",
    "email",
    "phone",
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "certifications",
  ],
} as const;

function buildPrompt(text: string): string {
  return [
    "You are an expert resume parser. Extract structured information from the resume text below.",
    "",
    "Rules:",
    "- Return ONLY valid JSON matching the provided schema.",
    '- For "skills", return a flat array of individual skill names (e.g. "React", "TypeScript").',
    '- For "experience"/"projects"/"education"/"certifications", preserve original order.',
    "- Use null for any missing field. Do not invent information.",
    "- Keep descriptions concise but faithful to the source.",
    "- Use ISO date strings (YYYY-MM) when a month/year is available, otherwise the text as-is.",
    "",
    "Resume text:",
    "```",
    text.slice(0, 60_000),
    "```",
  ].join("\n");
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
 * Send the extracted resume text to Gemini and receive a validated,
 * structured resume object.
 */
export async function extractStructuredResume(text: string): Promise<ParsedResumeData> {
  const ai = getGenAi();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildPrompt(text),
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
