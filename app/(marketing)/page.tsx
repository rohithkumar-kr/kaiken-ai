import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <span className="bg-muted text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
        Kaiken AI
      </span>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
        Cut through resume noise with precision AI evaluation.
      </h1>
      <p className="text-muted-foreground max-w-xl">
        Upload your resume, get an ATS compatibility score, compare against job descriptions, and
        land more interviews.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/sign-up"
          className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="bg-background hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
