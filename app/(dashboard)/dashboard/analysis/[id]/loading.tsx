import { AnalysisReportSkeleton } from "@/components/dashboard/report/report-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl">
      <AnalysisReportSkeleton />
    </div>
  );
}
