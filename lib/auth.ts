import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Server-side auth guard for Server Components, Route Handlers and Server
 * Actions. Redirects unauthenticated users to `/sign-in` (or returns 404 for
 * non-document requests). Returns the authenticated Clerk auth object.
 */
export async function requireUser() {
  return auth.protect();
}

/** Convenience: resolves to the current authenticated Clerk user id. */
export async function requireUserId() {
  const { userId } = await auth.protect();
  return userId;
}

/** Full Clerk backend user for the active session, or `null` when signed out. */
export function getCurrentUser() {
  return currentUser();
}
