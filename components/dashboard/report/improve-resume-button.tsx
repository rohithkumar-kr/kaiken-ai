"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const OPTIMIZE_FAILED = {
  title: "Couldn't optimize your resume",
  description:
    "Something went wrong while optimizing your resume. Please try again in a few moments.",
} as const;

type OptimizeResponse = {
  generatedResumeId?: string;
  title?: string;
  description?: string;
};

export function ImproveResumeButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function showOptimizeError(toastId: string | number, title?: string, description?: string) {
    toast.error(title ?? OPTIMIZE_FAILED.title, {
      id: toastId,
      description: description ?? OPTIMIZE_FAILED.description,
    });
  }

  async function handleImprove() {
    if (loading) return;

    setLoading(true);
    const toastId = toast.loading("Generating optimized resume...");
    try {
      const response = await fetch(`/api/analyses/${analysisId}/optimize`, {
        method: "POST",
      });
      const data = (await response.json()) as OptimizeResponse;
      if (!response.ok) {
        showOptimizeError(toastId, data.title, data.description);
        setLoading(false);
        return;
      }
      if (!data.generatedResumeId) {
        showOptimizeError(toastId);
        setLoading(false);
        return;
      }
      toast.loading("Preparing optimized resume...", { id: toastId });
      toast.success("Optimized resume ready", { id: toastId });
      router.push(`/dashboard/optimized/${data.generatedResumeId}`);
    } catch {
      showOptimizeError(toastId);
      setLoading(false);
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleImprove}
      disabled={loading}
      aria-label="Improve this resume with AI"
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles aria-hidden="true" />
      )}
      {loading ? "Improving…" : "Improve Resume"}
    </Button>
  );
}
