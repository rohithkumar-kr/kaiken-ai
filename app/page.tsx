export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="bg-muted text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
        Kaiken AI
      </span>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
        Kaiken AI — Precision AI Resume Evaluation
      </h1>
      <p className="text-muted-foreground max-w-xl">
        Cut through resume noise with precision AI evaluation. Upload your resume, get an ATS
        compatibility score, compare against job descriptions, and land more interviews.
      </p>
    </main>
  );
}
