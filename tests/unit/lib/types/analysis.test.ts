import { describe, expect, it } from "vitest";

import { atsOutputSchema } from "@/lib/types/analysis";

describe("atsOutputSchema", () => {
  it("parses a complete ATS report", () => {
    const result = atsOutputSchema.parse({
      atsScore: 82,
      formatScore: 90,
      keywordScore: 70,
      contentScore: 85,
      summary: "Strong match overall.",
      matchedKeywords: [
        { keyword: "TypeScript", importance: "HIGH", count: 4, section: "Skills" },
        { keyword: "Next.js", importance: "MEDIUM", count: 2, section: "Experience" },
      ],
      missingKeywords: [{ keyword: "Kubernetes", importance: "HIGH" }],
      strengths: ["Clear metrics in experience bullets."],
      weaknesses: ["Missing cloud platform keywords."],
      suggestions: [
        {
          type: "KEYWORD",
          section: "Skills",
          severity: "HIGH",
          title: "Add Kubernetes",
          description: "Mention Kubernetes in your skills.",
          aiRewrite: "Managed Kubernetes clusters on AWS EKS.",
        },
      ],
    });

    expect(result.atsScore).toBe(82);
    expect(result.matchedKeywords).toHaveLength(2);
    expect(result.matchedKeywords[0].importance).toBe("HIGH");
    expect(result.missingKeywords[0].keyword).toBe("Kubernetes");
    expect(result.suggestions[0].type).toBe("KEYWORD");
    expect(result.suggestions[0].aiRewrite).toContain("Kubernetes");
  });

  it("defaults missing sections to safe values", () => {
    const result = atsOutputSchema.parse({});

    expect(result).toEqual({
      atsScore: 0,
      formatScore: 0,
      keywordScore: 0,
      contentScore: 0,
      summary: null,
      matchedKeywords: [],
      missingKeywords: [],
      strengths: [],
      weaknesses: [],
      suggestions: [],
    });
  });

  it("coerces invalid scalar values instead of throwing", () => {
    const result = atsOutputSchema.parse({
      atsScore: "not-a-number",
      matchedKeywords: "not-an-array",
      suggestions: [{ type: "UNKNOWN", severity: 123 }],
    });

    expect(result.atsScore).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
    expect(result.suggestions[0].type).toBe("ACTION");
    expect(result.suggestions[0].severity).toBe("LOW");
    expect(result.suggestions[0].title).toBe("");
  });
});
