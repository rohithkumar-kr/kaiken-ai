import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Kaiken AI
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/sign-in"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
