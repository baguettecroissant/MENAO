import type { Metadata } from "next";
import { LegalPage } from "@/components/site/content-page";
import { LegalBody } from "@/components/site/legal-body";
import { confidentialite } from "@/content/legal";

export const metadata: Metadata = {
  title: `${confidentialite.title} — MENAO`,
  alternates: { canonical: "/confidentialite" },
};

// TODO(legal) : version provisoire, à faire valider par l'avocat avant l'ouverture (ADR 0377).
export default function Page() {
  return (
    <LegalPage path="/confidentialite" title={confidentialite.title} intro={confidentialite.intro}>
      <LegalBody document={confidentialite} />
    </LegalPage>
  );
}
