import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewSessionLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <div>
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="mt-1 h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
