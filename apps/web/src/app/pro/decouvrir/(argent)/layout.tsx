import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";

/** Rubrique « Argent » des exemples (ADR 0184, 0188). */
export default function ExampleMoneyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs section="argent" base={EXAMPLES_BASE} />
      {children}
    </>
  );
}
