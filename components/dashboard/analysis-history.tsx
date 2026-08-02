"use client";

import { CalendarDays, History, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisHistoryItem } from "@/lib/analysis-service";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "oldest" | "score-high" | "score-low";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "score-high", label: "Score: high to low" },
  { value: "score-low", label: "Score: low to high" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreTone(score: number | null): string {
  if (score === null) return "text-muted-foreground border-border bg-muted";
  if (score >= 95) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (score >= 80) return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (score >= 65) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

function HistoryRow({
  item,
  onDelete,
}: {
  item: AnalysisHistoryItem;
  onDelete: (item: AnalysisHistoryItem) => void;
}) {
  return (
    <Link
      href={`/dashboard/analysis/${item.id}`}
      className={cn(
        "border-border bg-card ring-foreground/10 hover:bg-muted/40 group flex items-center gap-4 rounded-xl p-4 ring-1 transition-colors",
        "sm:p-5"
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-full border text-base font-semibold tabular-nums sm:size-14 sm:text-lg",
          scoreTone(item.atsScore)
        )}
      >
        {item.atsScore ?? "—"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium sm:text-base">{item.jobTitle ?? "Untitled role"}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
          {item.jobCompany ? <span className="truncate">{item.jobCompany}</span> : null}
          {item.jobCompany ? <span className="opacity-50">·</span> : null}
          <span className="truncate">{item.resumeName ?? "Resume"}</span>
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <CalendarDays className="size-3" aria-hidden="true" />
          {formatDate(item.analyzedAt)}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(item);
        }}
        aria-label={`Delete analysis for ${item.jobTitle ?? "untitled role"}`}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </Link>
  );
}

export function AnalysisHistory({
  initialAnalyses,
}: {
  initialAnalyses: AnalysisHistoryItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [deleteTarget, setDeleteTarget] = useState<AnalysisHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searched = needle
      ? initialAnalyses.filter((item) =>
          [item.jobTitle, item.jobCompany, item.resumeName]
            .filter(Boolean)
            .some((value) => (value as string).toLowerCase().includes(needle))
        )
      : initialAnalyses;

    return [...searched].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime();
        case "score-high":
          return (b.atsScore ?? -1) - (a.atsScore ?? -1);
        case "score-low":
          return (a.atsScore ?? 1_000_000) - (b.atsScore ?? 1_000_000);
        default:
          return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
      }
    });
  }, [initialAnalyses, query, sort]);

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/analyses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete the analysis");
      }
      toast.success("Analysis deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete the analysis");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review past ATS analyses and revisit any report.
        </p>
      </div>

      {initialAnalyses.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by role, company, or resume…"
                aria-label="Search analyses"
                className="pl-8"
              />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger aria-label="Sort analyses" className="w-full sm:w-48">
                <SelectValue>
                  {SORT_OPTIONS.find((option) => option.value === sort)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filtered.map((item) => (
                <HistoryRow key={item.id} item={item} onDelete={setDeleteTarget} />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card ring-foreground/10 rounded-xl p-10 text-center ring-1">
              <p className="text-muted-foreground text-sm">
                No analyses match &ldquo;{query}&rdquo;.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-10 text-center ring-1">
          <History className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">No analyses yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Run an ATS analysis from the dashboard to start building your history.
            </p>
          </div>
          <Button render={<Link href="/dashboard" />} variant="outline" className="mt-2">
            Go to dashboard
          </Button>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete analysis?</DialogTitle>
            <DialogDescription>
              The report for &ldquo;{deleteTarget?.jobTitle ?? "untitled role"}&rdquo; will be
              permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
