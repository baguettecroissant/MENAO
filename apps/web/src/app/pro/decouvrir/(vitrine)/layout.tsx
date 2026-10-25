import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";

/** Rubrique « Ma vitrine » des exemples (ADR 0184, 0188). */
export default function ExampleStorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs section="vitrine" base={EXAMPLES_BASE} />
      {children}
    </>
  );
}
