import { Menu, X } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#demo", label: "Demo" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/75 sticky top-0 z-40 w-full border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link href="/" aria-label="Kaiken AI home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }), "h-8 px-3.5")}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ variant: "default" }), "h-8 px-3.5")}
          >
            Get started
          </Link>
        </div>

        <details className="group/menu relative md:hidden">
          <summary
            className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 cursor-pointer list-none place-items-center rounded-md transition-colors [&::-webkit-details-marker]:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="size-5 group-open/menu:hidden" aria-hidden="true" />
            <X className="hidden size-5 group-open/menu:block" aria-hidden="true" />
          </summary>
          <nav
            aria-label="Mobile"
            className="bg-popover absolute top-full right-0 flex w-56 flex-col gap-1 rounded-xl border p-2 shadow-lg"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 flex flex-col gap-1 border-t pt-2">
              <Link
                href="/sign-in"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-center text-sm font-medium"
              >
                Get started
              </Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
