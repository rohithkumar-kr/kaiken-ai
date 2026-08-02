import "server-only";

import type { ReportView } from "@/components/dashboard/report/types";
import type { AnalysisReportData } from "@/lib/analysis-service";

/** Map a persisted analysis to the serializable view used by the report UI. */
export function toReportView(analysis: AnalysisReportData): ReportView {
  return {
    id: analysis.id,
    atsScore: analysis.atsScore ?? 0,
    sections: [
      { label: "Formatting", value: analysis.formatScore ?? 0 },
      { label: "Keywords", value: analysis.keywordScore ?? 0 },
      { label: "Content", value: analysis.contentScore ?? 0 },
    ],
    summary: analysis.summary,
    matched: analysis.keywords
      .filter((keyword) => keyword.category === "PRESENT")
      .map((keyword) => ({
        id: keyword.id,
        keyword: keyword.keyword,
        importance: keyword.importance,
        count: keyword.count,
        section: keyword.section,
      })),
    missing: analysis.keywords
      .filter((keyword) => keyword.category === "MISSING")
      .map((keyword) => ({
        id: keyword.id,
        keyword: keyword.keyword,
        importance: keyword.importance,
        count: keyword.count,
        section: keyword.section,
      })),
    strengths: (analysis.strengths as unknown as string[] | null) ?? [],
    weaknesses: (analysis.weaknesses as unknown as string[] | null) ?? [],
    suggestions: analysis.suggestions.map((suggestion) => ({
      id: suggestion.id,
      type: suggestion.type,
      section: suggestion.section,
      severity: suggestion.severity,
      title: suggestion.title,
      description: suggestion.description,
      aiRewrite: suggestion.aiRewrite,
    })),
    resumeName: analysis.resume?.fileName ?? null,
    jobTitle: analysis.jobDescription?.title ?? null,
    jobCompany: analysis.jobDescription?.company ?? null,
    analyzedAt: (analysis.analyzedAt ?? analysis.createdAt).toISOString(),
  };
}
