"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ImproveResumeButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleImprove() {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/optimize`, {
        method: "POST",
      });
      const data = (await response.json()) as { generatedResumeId?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to optimize the resume");
      }
      if (!data.generatedResumeId) {
        throw new Error("No optimized resume was returned");
      }
      toast.success("Resume optimized — showing your improved version");
      router.push(`/dashboard/optimized/${data.generatedResumeId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to optimize the resume");
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
