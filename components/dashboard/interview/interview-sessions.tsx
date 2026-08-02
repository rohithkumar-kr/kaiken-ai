"use client";

import { Loader2, Mic, Pencil, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  EXPERIENCE_LABELS,
  TYPE_LABELS,
  typeTone,
} from "@/components/dashboard/interview/interview-labels";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  interviewTypeSchema,
  type ExperienceLevel,
  type InterviewSessionItem,
  type InterviewType,
} from "@/lib/types/interview";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SessionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InterviewSessionItem;
  onEdit: (item: InterviewSessionItem) => void;
  onDelete: (item: InterviewSessionItem) => void;
}) {
  const role = [item.jobRole, item.company].filter(Boolean).join(" — ");

  return (
    <Link
      href={`/dashboard/interviews/${item.id}`}
      className="border-border bg-card ring-foreground/10 hover:bg-muted/40 group flex items-center gap-4 rounded-xl p-4 ring-1 transition-colors sm:p-5"
    >
      <span className="border-border bg-muted grid size-12 shrink-0 place-items-center rounded-full border sm:size-14">
        <Mic className="text-muted-foreground size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium sm:text-base">{role || "Untitled session"}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              typeTone(item.interviewType)
            )}
          >
            {TYPE_LABELS[item.interviewType]}
          </span>
          <span className="truncate">{EXPERIENCE_LABELS[item.experienceLevel]}</span>
          <span className="opacity-50">·</span>
          <span className="truncate">Created {formatDate(item.createdAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit(item);
          }}
        >
          <Pencil data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(item);
          }}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </Link>
  );
}

export function InterviewSessions({
  initialInterviewSessions,
}: {
  initialInterviewSessions: InterviewSessionItem[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("MID");
  const [interviewType, setInterviewType] = useState<InterviewType>("MIXED");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<InterviewSessionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const roleEmpty = !jobRole.trim();
  const canSubmit = !roleEmpty && !saving;

  function resetForm() {
    setJobRole("");
    setCompany("");
    setExperienceLevel("MID");
    setInterviewType("MIXED");
    setEditingId(null);
    setFormError(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(item: InterviewSessionItem) {
    setEditingId(item.id);
    setJobRole(item.jobRole);
    setCompany(item.company ?? "");
    setExperienceLevel(item.experienceLevel);
    setInterviewType(item.interviewType);
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (roleEmpty) {
      setFormError("Please provide the job role for this interview.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const toastId = toast.loading(editingId ? "Updating session..." : "Creating session...");

    const payload = {
      jobRole: jobRole.trim(),
      company: company.trim() || null,
      experienceLevel,
      interviewType,
    };

    try {
      const response = await fetch(
        editingId ? `/api/interviews/${editingId}` : "/api/interviews",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await response.json()) as {
        interviewSession?: InterviewSessionItem;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save the interview session");
      }
      toast.success(editingId ? "Session updated" : "Session created", { id: toastId });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setFormError(message);
      toast.error("Save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const toastId = toast.loading("Deleting...");
    try {
      const response = await fetch(`/api/interviews/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete the interview session");
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
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Prepare for your next interview with AI-generated practice sessions.
          </p>
        </div>
        <Button variant="default" size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          New session
        </Button>
      </div>

      {initialInterviewSessions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {initialInterviewSessions.map((item) => (
            <SessionRow
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-10 text-center ring-1">
          <Mic className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">No interview sessions yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a session to generate AI practice questions for a role you are targeting.
            </p>
          </div>
          <Button variant="outline" className="mt-2" onClick={openCreate}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Create your first session
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !saving) {
            setOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit interview session" : "New interview session"}</DialogTitle>
            <DialogDescription>
              Set up a practice interview. Questions are generated in the next step.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-role">Job role</Label>
              <Input
                id="interview-role"
                value={jobRole}
                onChange={(event) => setJobRole(event.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-company">
                Company <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="interview-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="e.g. Acme Corp"
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="interview-experience">Experience level</Label>
                <Select
                  value={experienceLevel}
                  onValueChange={(value) => setExperienceLevel(value as ExperienceLevel)}
                >
                  <SelectTrigger id="interview-experience" aria-label="Experience level" className="w-full">
                    <SelectValue>{EXPERIENCE_LABELS[experienceLevel]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((level) => (
                      <SelectItem key={level} value={level}>
                        {EXPERIENCE_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="interview-type">Interview type</Label>
                <Select
                  value={interviewType}
                  onValueChange={(value) => setInterviewType(value as InterviewType)}
                >
                  <SelectTrigger id="interview-type" aria-label="Interview type" className="w-full">
                    <SelectValue>{TYPE_LABELS[interviewType]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypeSchema.options.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError ? (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : editingId ? (
                  <Save data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Plus data-icon="inline-start" aria-hidden="true" />
                )}
                {saving ? "Saving…" : editingId ? "Update session" : "Create session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete interview session?</DialogTitle>
            <DialogDescription>
              The session for &ldquo;{deleteTarget?.jobRole ?? "untitled role"}&rdquo; will be
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
