"use client";

import { Download, FileDown, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";

type ExportFormat = "pdf" | "markdown";

export function ExportButton({ analysisId }: { analysisId: string }) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (exporting) return;

    setExporting(format);
    const toastId = toast.loading(format === "pdf" ? "Generating PDF..." : "Preparing Markdown...");
    try {
      const response = await fetch(`/api/analyses/${analysisId}/export?format=${format}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to export the report");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `ats-analysis.${format === "pdf" ? "pdf" : "md"}`;

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

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" size="sm" disabled={exporting !== null} />}>
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
          aria-label="Download report as PDF"
        >
          <FileDown aria-hidden="true" />
          Download PDF
        </MenuItem>
        <MenuItem
          onClick={() => handleExport("markdown")}
          disabled={exporting !== null}
          aria-label="Download report as Markdown"
        >
          <FileText aria-hidden="true" />
          Download Markdown
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
