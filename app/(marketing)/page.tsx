import { auth } from "@clerk/nextjs/server";

import { AtsDemo } from "@/components/marketing/ats-demo";
import { Cta } from "@/components/marketing/cta";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TrustedBy } from "@/components/marketing/trusted-by";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = userId !== null;

  return (
    <>
      <SiteHeader isSignedIn={isSignedIn} />
      <main className="flex-1">
        <Hero isSignedIn={isSignedIn} />
        <TrustedBy />
        <Features />
        <HowItWorks />
        <AtsDemo />
        <Pricing />
        <Faq />
        <Cta isSignedIn={isSignedIn} />
      </main>
      <SiteFooter />
    </>
  );
}
