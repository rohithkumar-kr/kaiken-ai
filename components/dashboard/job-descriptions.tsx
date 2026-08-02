"use client";

import { Loader2, Pencil, Plus, Save, ScanSearch, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobDescriptionItem } from "@/lib/types/job-description";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobDescriptions({
  initialJobDescriptions,
  hasParsedResume = false,
}: {
  initialJobDescriptions: JobDescriptionItem[];
  hasParsedResume?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<JobDescriptionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const titleEmpty = !title.trim();
  const contentEmpty = !content.trim();
  const canSubmit = !titleEmpty && !contentEmpty && !saving;
  const showEmptyError = formError !== null && (titleEmpty || contentEmpty);

  function resetForm() {
    setTitle("");
    setCompany("");
    setContent("");
    setEditingId(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (titleEmpty || contentEmpty) {
      setFormError("Please provide both a title and the job description text.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      title: title.trim(),
      company: company.trim() || null,
      content: content.trim(),
    };

    try {
      const response = await fetch(
        editingId ? `/api/job-descriptions/${editingId}` : "/api/job-descriptions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await response.json()) as { jobDescription?: JobDescriptionItem; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save the job description");
      }
      toast.success(editingId ? "Job description updated" : "Job description saved");
      resetForm();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: JobDescriptionItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setCompany(item.company ?? "");
    setContent(item.content);
    setFormError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/job-descriptions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete the job description");
      }
      toast.success("Job description deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete the job description"
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAnalyze(item: JobDescriptionItem) {
    if (analyzingId) return;

    setAnalyzingId(item.id);
    try {
      const response = await fetch("/api/analyze-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescriptionId: item.id }),
      });
      const data = (await response.json()) as { analysisId?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to run the analysis");
      }
      toast.success("Analysis complete");
      if (data.analysisId) {
        router.push(`/dashboard/analysis/${data.analysisId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run the analysis");
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <section aria-label="Job descriptions" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Job descriptions</h2>
        <p className="text-muted-foreground text-xs">
          Paste a role you are targeting so it can be analyzed later.
        </p>
      </div>

      <div ref={formRef} className="scroll-mt-20">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit job description" : "Add a job description"}</CardTitle>
            <CardDescription>
              Save a job description to use for ATS analysis in the next milestone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jd-title">Title</Label>
                  <Input
                    id="jd-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    disabled={saving}
                    aria-invalid={(titleEmpty && showEmptyError) || undefined}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jd-company">
                    Company <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="jd-company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="e.g. Acme Corp"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jd-content">Job description</Label>
                <Textarea
                  id="jd-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste the full job description here…"
                  className="min-h-44 resize-y"
                  disabled={saving}
                  aria-invalid={(contentEmpty && showEmptyError) || undefined}
                />
              </div>

              {formError ? (
                <p role="alert" className="text-destructive text-sm">
                  {formError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                {editingId ? (
                  <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" disabled={!canSubmit}>
                  {saving ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : editingId ? (
                    <Save data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Plus data-icon="inline-start" aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : editingId ? "Update" : "Save job description"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        {initialJobDescriptions.length > 0 ? (
          initialJobDescriptions.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{item.title}</span>
                </CardTitle>
                {item.company ? (
                  <CardDescription>
                    <span className="truncate">{item.company}</span>
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p
                  className={cn(
                    "text-muted-foreground text-sm leading-relaxed whitespace-pre-line",
                    "line-clamp-4"
                  )}
                >
                  {item.content}
                </p>
                <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                  <span>Updated {formatDate(item.updatedAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyze(item)}
                      disabled={!hasParsedResume || analyzingId !== null}
                      title={
                        hasParsedResume
                          ? "Analyze your latest parsed resume against this job"
                          : "Upload and parse a resume first"
                      }
                    >
                      {analyzingId === item.id ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <ScanSearch data-icon="inline-start" aria-hidden="true" />
                      )}
                      {analyzingId === item.id ? "Analyzing…" : "Analyze"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      <Pencil data-icon="inline-start" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-muted-foreground text-sm italic">
              No saved job descriptions yet. Add one above to get started.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete job description?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed. This action cannot be
              undone.
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
    </section>
  );
}
