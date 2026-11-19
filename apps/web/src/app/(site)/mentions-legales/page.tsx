import type { Metadata } from "next";
import { LegalPage } from "@/components/site/content-page";
import { LegalBody } from "@/components/site/legal-body";
import { mentionsLegales } from "@/content/legal";

export const metadata: Metadata = {
  title: `${mentionsLegales.title} — MENAO`,
  alternates: { canonical: "/mentions-legales" },
};

// TODO(legal) : version provisoire, à faire valider par l'avocat avant l'ouverture (ADR 0377).
export default function Page() {
  return (
    <LegalPage path="/mentions-legales" title={mentionsLegales.title} intro={mentionsLegales.intro}>
      <LegalBody document={mentionsLegales} />
    </LegalPage>
  );
}
