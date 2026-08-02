import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewPracticeLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-44" />
      <div>
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="mt-1 h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
