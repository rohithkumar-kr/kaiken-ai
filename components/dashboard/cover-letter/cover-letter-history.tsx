"use client";

import { FilePenLine, Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import type { CoverLetterItem } from "@/lib/types/cover-letter";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HistoryRow({
  item,
  onDelete,
}: {
  item: CoverLetterItem;
  onDelete: (item: CoverLetterItem) => void;
}) {
  const role = [item.jobTitle, item.jobCompany].filter(Boolean).join(" — ");
  const snippet = item.content.split(/\n{2,}/).find((paragraph) => paragraph.trim());

  return (
    <Link
      href={`/dashboard/cover-letters/${item.id}`}
      className="border-border bg-card ring-foreground/10 hover:bg-muted/40 group flex items-center gap-4 rounded-xl p-4 ring-1 transition-colors sm:p-5"
    >
      <span className="border-border bg-muted grid size-12 shrink-0 place-items-center rounded-full border sm:size-14">
        <FilePenLine className="text-muted-foreground size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium sm:text-base">
          {item.candidateName ? `${item.candidateName} — ` : ""}
          {role || "Untitled letter"}
        </p>
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs sm:text-sm">
          {snippet ?? "Generated cover letter"}
        </p>
        <div className="text-muted-foreground mt-1 text-xs">
          {item.resumeName ? `${item.resumeName} · ` : ""}
          {formatDate(item.createdAt)}
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
        aria-label={`Delete cover letter for ${role || "untitled letter"}`}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </Link>
  );
}

export function CoverLetterHistory({
  initialCoverLetters,
}: {
  initialCoverLetters: CoverLetterItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CoverLetterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initialCoverLetters;
    return initialCoverLetters.filter((item) =>
      [item.jobTitle, item.jobCompany, item.candidateName, item.resumeName, item.content]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(needle))
    );
  }, [initialCoverLetters, query]);

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const toastId = toast.loading("Deleting...");
    try {
      const response = await fetch(`/api/cover-letters/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete the cover letter");
      }
      toast.success("Deleted successfully", { id: toastId });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Delete failed", { id: toastId });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cover Letters</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and edit your AI-generated cover letters.
          </p>
        </div>
        <Button render={<Link href="/dashboard/history" />} variant="default" size="sm">
          <Plus aria-hidden="true" />
          New
        </Button>
      </div>

      {initialCoverLetters.length > 0 ? (
        <>
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by role, company, or candidate…"
              aria-label="Search cover letters"
              className="pl-8"
            />
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
                No cover letters match &ldquo;{query}&rdquo;.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-10 text-center ring-1">
          <FilePenLine className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">No cover letters yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Run an ATS analysis, then generate a cover letter from the report page.
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
            <DialogTitle>Delete cover letter?</DialogTitle>
            <DialogDescription>
              The letter for &ldquo;{deleteTarget?.jobTitle ?? "untitled role"}&rdquo; will be
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
