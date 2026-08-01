import { currentUser } from "@clerk/nextjs/server";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const user = await currentUser();

  return (
    <DashboardShell
      user={{
        name: user?.firstName ?? user?.username ?? "User",
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
