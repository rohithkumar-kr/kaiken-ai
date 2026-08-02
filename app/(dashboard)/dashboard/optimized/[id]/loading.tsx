import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <Skeleton className="h-[28rem] w-full" />
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}
