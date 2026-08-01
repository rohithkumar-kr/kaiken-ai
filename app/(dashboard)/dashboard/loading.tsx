import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}
