"use client";

import { FilePenLine, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function GenerateCoverLetterButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (loading) return;

    setLoading(true);
    const toastId = toast.loading("Generating cover letter...");
    try {
      const response = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const data = (await response.json()) as {
        coverLetterId?: string;
        error?: string;
        code?: string;
        retryAfterSeconds?: number | null;
      };
      if (response.status === 429 && data.code === "GEMINI_QUOTA_EXCEEDED") {
        const description =
          data.retryAfterSeconds != null
            ? `Please wait about ${data.retryAfterSeconds} seconds and try again.`
            : "Please wait a minute and try again.";
        toast.error("Gemini quota reached", { description, id: toastId });
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate the cover letter");
      }
      if (!data.coverLetterId) {
        throw new Error("No cover letter was returned");
      }
      toast.loading("Preparing cover letter...", { id: toastId });
      toast.success("Cover letter generated", { id: toastId });
      router.push(`/dashboard/cover-letters/${data.coverLetterId}`);
    } catch {
      toast.error("Generation failed", { id: toastId });
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
      aria-label="Generate a cover letter for this job"
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <FilePenLine aria-hidden="true" />
      )}
      {loading ? "Generating…" : "Cover Letter"}
    </Button>
  );
}
