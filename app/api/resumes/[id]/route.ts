import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { deleteResume, ensureUser } from "@/lib/resume-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const [{ userId }, { id }] = await Promise.all([
    auth(),
    context.params,
  ]);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const clerkUser = await currentUser();

    const localUser = await ensureUser(
      userId,
      clerkUser?.primaryEmailAddress?.emailAddress ??
        `${userId}@kaiken.local`
    );

    await deleteResume(localUser.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return apiErrorResponse(error, {
      fallbackMessage:
        "Something went wrong while deleting your resume. Please try again.",
    });
  }
}