import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths reachable without authentication. Everything else is protected.
 * Add webhook paths here when they land (e.g. `/api/webhooks(.*)`).
 */
function isPublicPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (!isPublicPath(req.nextUrl.pathname)) {
    // Resource-based guard: throws a redirect to `/sign-in` (with return-back
    // URL) when signed out; for non-document requests it returns a 404.
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
