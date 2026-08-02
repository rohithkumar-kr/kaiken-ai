import "server-only";

import { createPartFromBase64, GoogleGenAI } from "@google/genai";

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
