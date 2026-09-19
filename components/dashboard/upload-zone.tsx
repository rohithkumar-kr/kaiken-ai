"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadFiles } from "@/lib/uploadthing-client";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const STEPS = [
  { label: "Uploading" },
  { label: "Extracting text" },
  { label: "AI parsing" },
  { label: "Saving to your account" },
];

const STEP_DURATION_MS = 1200;

type Phase =
  | "idle"
  | "uploading"
  | "analyzing"
  | "done"
  | "error";

type ExistingResume = {
  id: string;
  fileName: string;
  fileType: string;
  fileKey: string;
  fileSize: number;
  parseStatus: string;
};

type AnalyzePayload = {
  resumeId: string;
};

function validateFile(file: File): string | null {
  if (
    !ACCEPTED_MIME_TYPES.has(file.type) &&
    !/\.(pdf|docx)$/i.test(file.name)
  ) {
    return "Unsupported file type. Please upload a PDF or DOCX file.";
  }

  if (file.size === 0) {
    return "The selected file appears to be empty.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10MB.";
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({
  resume,
}: {
  resume?: ExistingResume | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const tickerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isBusy =
    phase === "uploading" ||
    phase === "analyzing" ||
    isDeleting;

  const stopTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  useEffect(() => stopTicker, [stopTicker]);

  async function runAnalyze(
    payload: AnalyzePayload,
    startStep: number,
    toastId?: string | number
  ) {
    setPhase("analyzing");
    setStepIndex(startStep);
    setError(null);

    const startedAt = Date.now();

    tickerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;

      setStepIndex(
        Math.min(
          startStep + Math.floor(elapsed / STEP_DURATION_MS),
          STEPS.length - 1
        )
      );
    }, 200);

    try {
      if (toastId !== undefined) {
        toast.loading("Analyzing with AI...", {
          id: toastId,
        });
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        parsed?: unknown;
        error?: string;
      };

      if (!response.ok || !data.parsed) {
        throw new Error(
          data.error ?? "Failed to analyze your resume"
        );
      }

      setStepIndex(STEPS.length - 1);
      setPhase("done");

      if (toastId !== undefined) {
        toast.loading("Preparing report...", {
          id: toastId,
        });

        toast.success("Resume parsed successfully", {
          id: toastId,
        });
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );

      setPhase("error");

      if (toastId !== undefined) {
        toast.error("Resume upload failed", {
          id: toastId,
        });
      }
    } finally {
      stopTicker();
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const file = files[0];

    if (!file) return;

    const validationError = validateFile(file);

    if (validationError) {
      setFileInfo({
        name: file.name,
        size: file.size,
      });

      setError(validationError);
      setPhase("error");

      return;
    }

    setFileInfo({
      name: file.name,
      size: file.size,
    });

    setError(null);
    setUploadProgress(0);
    setStepIndex(0);
    setPhase("uploading");

    const toastId = toast.loading("Uploading resume...");

    try {
      const [uploaded] = await uploadFiles("resumeUploader", {
        files: [file],

        onUploadProgress: ({ progress }) => {
          setUploadProgress(progress);

          toast.loading(
            `Uploading resume... ${Math.round(progress)}%`,
            {
              id: toastId,
            }
          );
        },
      });

      if (!uploaded) {
        throw new Error(
          "Upload failed. Please try again."
        );
      }

      /*
       * The UploadThing server callback creates the Resume record
       * and returns its database ID as serverData.
       *
       * We intentionally do NOT send uploaded.key or other file
       * metadata to /api/analyze.
       */
      /*
 * The UploadThing server callback creates the Resume record
 * and returns its database ID as serverData.
 */
const resumeId = uploaded.serverData?.resumeId;

if (!resumeId) {
  throw new Error(
    "Upload completed but the resume record was not created."
  );
}

toast.loading("Extracting resume...", {
  id: toastId,
});

await runAnalyze(
  {
    resumeId,
  },
  1,
  toastId
);  
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );

      setPhase("error");

      toast.error("Resume upload failed", {
        id: toastId,
      });
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    void handleFiles(event.dataTransfer.files);
  }

  function handleReset() {
    setError(null);
    setFileInfo(null);
    setUploadProgress(0);
    setPhase("idle");
  }

  function handleReanalyze() {
    if (!resume || isDeleting) return;

    const toastId = toast.loading("Parsing resume...");

    void runAnalyze(
      {
        resumeId: resume.id,
      },
      1,
      toastId
    );
  }

  async function handleDelete() {
    if (!resume || isDeleting || phase === "uploading" || phase === "analyzing") {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${resume.fileName}"?\n\nThis will permanently remove the resume and its generated analyses, parsed data, and related results. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    const toastId = toast.loading("Deleting resume...");

    try {
      const response = await fetch(
        `/api/resumes/${encodeURIComponent(resume.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Failed to delete your resume"
        );
      }

      toast.success("Resume deleted successfully", {
        id: toastId,
      });

      setFileInfo(null);
      setUploadProgress(0);
      setStepIndex(0);
      setError(null);
      setPhase("idle");

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting your resume.";

      setError(message);
      setPhase("error");

      toast.error("Resume deletion failed", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {phase === "done" ? (
        <div className="bg-muted/30 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircle2
              className="size-5 shrink-0"
              aria-hidden="true"
            />

            <div className="min-w-0">
              <p className="text-sm font-medium">
                Resume parsed successfully
              </p>

              <p className="text-muted-foreground truncate text-xs">
                {fileInfo?.name} — AI extraction complete and saved
                to your account.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {resume ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={isBusy}
                >
                  <RefreshCw
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Re-analyze
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete()}
                  disabled={isBusy}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Delete
                </Button>
              </>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isBusy}
            >
              <UploadCloud
                data-icon="inline-start"
                aria-hidden="true"
              />
              Upload another
            </Button>
          </div>
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload your resume (PDF or DOCX, max 10MB)"
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging
            ? "border-foreground bg-muted/50"
            : "border-border bg-muted/20 hover:bg-muted/40",
          isBusy && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            if (event.target.files) {
              void handleFiles(event.target.files);
            }

            event.target.value = "";
          }}
        />

        {isBusy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2
              className="size-8 animate-spin"
              aria-hidden="true"
            />

            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium">
                {isDeleting
                  ? "Deleting resume..."
                  : fileInfo?.name}
              </p>

              <p className="text-muted-foreground text-xs">
                {isDeleting
                  ? "Removing your resume and related data..."
                  : phase === "uploading"
                    ? `Uploading… ${Math.round(uploadProgress)}%`
                    : "Parsing with precision AI…"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="bg-background grid size-12 place-items-center rounded-full border">
              <UploadCloud
                className="size-6"
                aria-hidden="true"
              />
            </span>

            <div>
              <p className="text-sm font-medium">
                Drag &amp; drop your resume here
              </p>

              <p className="text-muted-foreground mt-1 text-xs">
                or click to browse — PDF or DOCX, up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {resume?.parseStatus === "FAILED" &&
      phase === "idle" ? (
        <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className="text-destructive size-5 shrink-0"
              aria-hidden="true"
            />

            <div>
              <p className="text-sm font-medium">
                Previous analysis of {resume.fileName} failed
              </p>

              <p className="text-muted-foreground text-xs">
                The file is still on file. Retry parsing without
                re-uploading.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReanalyze}
            disabled={isBusy}
          >
            <RefreshCw
              data-icon="inline-start"
              aria-hidden="true"
            />
            Retry parsing
          </Button>
        </div>
      ) : null}

      {isBusy && !isDeleting ? (
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, index) => {
            const isDone = index < stepIndex;
            const isActive = index === stepIndex;

            return (
              <li
                key={step.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                  isDone &&
                    "bg-muted/40 text-muted-foreground border-transparent",
                  isActive &&
                    "border-foreground/20 bg-muted/40"
                )}
              >
                {isDone ? (
                  <CheckCircle2
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : isActive ? (
                  <Loader2
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border" />
                )}

                <span
                  className={cn(
                    isActive && "font-medium"
                  )}
                >
                  {step.label}
                </span>

                {isActive &&
                phase === "uploading" &&
                stepIndex === 0 ? (
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {Math.round(uploadProgress)}%
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {phase === "error" ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-xl border px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-destructive mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />

            <div>
              <p className="text-sm font-medium">
                Something went wrong
              </p>

              <p className="text-muted-foreground mt-1 text-sm">
                {error ?? "An unexpected error occurred."}

                {fileInfo ? (
                  <>
                    {" "}
                    <FileText
                      className="inline size-3.5"
                      aria-hidden="true"
                    />{" "}
                    {fileInfo.name},{" "}
                    {formatBytes(fileInfo.size)}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCw
                data-icon="inline-start"
                aria-hidden="true"
              />
              Try again
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}