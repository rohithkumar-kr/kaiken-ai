"use client";

import {
  ArrowLeft,
  Copy,
  Download,
  FileDown,
  FilePenLine,
  FileText,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ExportFormat = "pdf" | "markdown";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CoverLetterEditor({
  id,
  initialContent,
  candidateName,
  candidateEmail,
  candidatePhone,
  jobTitle,
  jobCompany,
  resumeName,
  createdAt,
}: {
  id: string;
  initialContent: string;
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  resumeName: string | null;
  createdAt: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    const toastId = toast.loading("Saving changes...");
    try {
      const response = await fetch(`/api/cover-letters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save the cover letter");
      }
      setDirty(false);
      toast.success("Changes saved", { id: toastId });
    } catch {
      toast.error("Save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    const text = [candidateName, candidateEmail, candidatePhone]
      .filter(Boolean)
      .concat([`Re: ${[jobTitle, jobCompany].filter(Boolean).join(" — ")}`, ""])
      .concat(paragraphs)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleExport(format: ExportFormat) {
    if (exporting) return;
    setExporting(format);
    const toastId = toast.loading(format === "pdf" ? "Generating PDF..." : "Preparing Markdown...");
    try {
      const response = await fetch(
        `/api/cover-letters/${id}/export?format=${format}`
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to export the cover letter");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `cover-letter.${format === "pdf" ? "pdf" : "md"}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(format === "pdf" ? "PDF downloaded" : "Markdown downloaded", { id: toastId });
    } catch {
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(null);
    }
  }

  const roleLabel = [jobTitle, jobCompany].filter(Boolean).join(" — ");

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto flex max-w-4xl flex-col gap-6"
    >
      <div className="flex flex-col gap-4">
        <Button
          render={<Link href="/dashboard/cover-letters" />}
          variant="ghost"
          className="text-muted-foreground w-fit -ml-2"
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to cover letters
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Cover Letter</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {candidateName ? `${candidateName} · ` : ""}
              {roleLabel || "Untitled role"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {[resumeName, formatDate(createdAt)].filter(Boolean).join(" · ") || "Generated for you"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label="Copy the cover letter to clipboard"
            >
              <Copy aria-hidden="true" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              aria-label="Save the cover letter"
            >
              {saving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
            <Menu>
              <MenuTrigger
                render={<Button variant="default" size="sm" disabled={exporting !== null} />}
              >
              {exporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download data-icon="inline-start" aria-hidden="true" />
              )}
              {exporting ? "Exporting…" : "Export"}
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null}
                  aria-label="Download the cover letter as PDF"
                >
                  <FileDown aria-hidden="true" />
                  Download PDF
                </MenuItem>
                <MenuItem
                  onClick={() => handleExport("markdown")}
                  disabled={exporting !== null}
                  aria-label="Download the cover letter as Markdown"
                >
                  <FileText aria-hidden="true" />
                  Download Markdown
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="edit">
            <FilePenLine aria-hidden="true" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview">
            <FileText aria-hidden="true" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="border-border bg-card ring-foreground/10 rounded-xl p-4 ring-1">
            <Textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setDirty(true);
              }}
              aria-label="Cover letter body"
              className="min-h-[26rem] resize-y leading-relaxed"
            />
            <p className="text-muted-foreground mt-2 text-xs">
              {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"} · ~
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border-border bg-card ring-foreground/10 rounded-xl p-6 ring-1 sm:p-8">
            <div className="mb-6">
              {candidateName ? (
                <h2 className="text-xl font-bold">{candidateName}</h2>
              ) : null}
              {[candidateEmail, candidatePhone].filter(Boolean).length > 0 ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {[candidateEmail, candidatePhone].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <div className="border-border my-4 border-t" />
              {formatDate(createdAt) ? (
                <p className="text-muted-foreground text-sm">{formatDate(createdAt)}</p>
              ) : null}
              {roleLabel ? (
                <p className="text-sm font-medium">{roleLabel}</p>
              ) : null}
            </div>

            {paragraphs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">The cover letter body is empty.</p>
            )}

            {candidateName ? (
              <p className="mt-8 font-semibold">{candidateName}</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </motion.main>
  );
}
