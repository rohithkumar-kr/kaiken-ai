import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignIn
  forceRedirectUrl="/dashboard"
  fallbackRedirectUrl="/dashboard"
/>;
}
