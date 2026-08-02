export type ReportSectionScore = {
  label: string;
  value: number;
};

export type ReportKeyword = {
  id: string;
  keyword: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  count: number;
  section: string | null;
};

export type ReportSuggestion = {
  id: string;
  type: "CONTENT" | "KEYWORD" | "FORMAT" | "ACTION";
  section: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  aiRewrite: string | null;
};

export type ReportView = {
  id: string;
  atsScore: number;
  sections: ReportSectionScore[];
  summary: string | null;
  matched: ReportKeyword[];
  missing: ReportKeyword[];
  strengths: string[];
  weaknesses: string[];
  suggestions: ReportSuggestion[];
  resumeName: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  analyzedAt: string | null;
};
