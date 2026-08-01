import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      >
        Back home
      </Link>
    </div>
  );
}
