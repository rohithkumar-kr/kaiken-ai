import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? user?.username ?? "there";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
        <p className="text-muted-foreground">
          Track your resume&apos;s ATS performance and optimize with precision AI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No resumes yet</CardTitle>
          <CardDescription>
            Upload your first resume to get a precision ATS evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Resume upload arrives in the next milestone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
