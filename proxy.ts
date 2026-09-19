import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths reachable without authentication.
 * UploadThing is special:
 *
 * 1. Browser upload request:
 *    /api/uploadthing?actionType=upload&slug=resumeUploader
 *    -> MUST pass through Clerk middleware so auth() works.
 *
 * 2. UploadThing dev callback:
 *    /api/uploadthing?slug=resumeUploader
 *    -> MUST bypass Clerk/Next.js Proxy so the request body is not
 *       buffered/cloned and detached ArrayBuffer errors are avoided.
 */
function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  );
}

export default clerkMiddleware(
  async (auth, req: NextRequest) => {
    const pathname = req.nextUrl.pathname;

    // UploadThing callback requests are server-to-server and do not
    // have the user's browser Clerk session.
    //
    // The actual browser upload request is protected separately by
    // the UploadThing middleware in app/api/uploadthing/core.ts.
    if (pathname.startsWith("/api/uploadthing")) {
      const actionType = req.nextUrl.searchParams.get("actionType");

      // Only the browser's actual upload action should reach Clerk.
      // UploadThing's server-side callback bypasses this Proxy.
      if (actionType === "upload") {
        return NextResponse.next();
      }

      return NextResponse.next();
    }

    if (!isPublicPath(pathname)) {
      // Resource-based guard: throws a redirect to `/sign-in` (with
      // return-back URL) when signed out; for non-document requests
      // it returns a 404.
      await auth.protect();
    }

    return NextResponse.next();
  },
  {
    afterSignInUrl: "/dashboard",
    afterSignUpUrl: "/dashboard",
  }
);

export const config = {
  matcher: [
    // Normal application routes and APIs.
    // UploadThing is excluded from this broad matcher and handled
    // separately below.
    "/((?!_next|api/uploadthing|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    // Keep tRPC protected.
    "/trpc(.*)",

    // IMPORTANT:
    // Match ONLY UploadThing's browser upload request.
    //
    // Example:
    // /api/uploadthing?actionType=upload&slug=resumeUploader
    //
    // The UploadThing dev callback does not contain actionType=upload,
    // so it will bypass Clerk middleware.
    {
      source: "/api/uploadthing",
      has: [
        {
          type: "query",
          key: "actionType",
          value: "upload",
        },
      ],
    },
  ],
};