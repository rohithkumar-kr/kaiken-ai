import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisReportSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
      </div>

      <Skeleton className="h-24 w-full" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>

      <Skeleton className="h-72 w-full" />
    </div>
  );
}
