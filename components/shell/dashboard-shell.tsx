"use client";

import { UserButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import { History, LayoutDashboard, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  name: string;
  email?: string | null;
};

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/history", label: "History", icon: History },
];

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-2 text-sm font-semibold tracking-tight"
    >
      Kaiken AI
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <aside className="bg-background fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r p-4 md:flex">
        <div className="mb-6">
          <Brand />
        </div>
        <NavList pathname={pathname} />
      </aside>

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} swipeDirection="left">
        <DrawerContent>
          <div className="flex items-center justify-between p-4 pb-0">
            <Brand />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="flex min-h-dvh flex-col md:pl-60">
        <header className="bg-background sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-semibold tracking-tight md:hidden">Kaiken AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm leading-tight font-medium">{user.name}</span>
              {user.email ? (
                <span className="text-muted-foreground text-xs">{user.email}</span>
              ) : null}
            </div>
            <UserButton />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
