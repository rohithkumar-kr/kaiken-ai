"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          An unexpected error occurred{error.digest ? ` (${error.digest})` : ""}.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
