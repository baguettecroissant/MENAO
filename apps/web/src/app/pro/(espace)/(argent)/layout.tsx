import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";

/** Rubrique « Argent » du menu regroupé (ADR 0188) : onglets en haut des listes. */
export default function MoneyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs section="argent" />
      {children}
    </>
  );
}
