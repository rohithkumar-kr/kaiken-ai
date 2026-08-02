import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths reachable without authentication. Everything else is protected.
 * Add webhook paths here when they land (e.g. `/api/webhooks(.*)`).
 */
function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    // UploadThing callback: the upload action is authenticated inside the
    // route (core.ts middleware), and the dev-stream callback is a
    // server-to-server request with no browser session (HMAC-verified).
    pathname.startsWith("/api/uploadthing")
  );
}

export default clerkMiddleware(
  async (auth, req: NextRequest) => {
    if (!isPublicPath(req.nextUrl.pathname)) {
      // Resource-based guard: throws a redirect to `/sign-in` (with return-back
      // URL) when signed out; for non-document requests it returns a 404.
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
    // Skip Next internals and static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
