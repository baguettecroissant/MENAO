import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";

/** Rubrique « Ma vitrine » du menu regroupé (ADR 0188) : onglets en haut des listes. */
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs section="vitrine" />
      {children}
    </>
  );
}
