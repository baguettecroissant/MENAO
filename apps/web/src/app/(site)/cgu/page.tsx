import type { Metadata } from "next";
import { LegalPage } from "@/components/site/content-page";
import { LegalBody } from "@/components/site/legal-body";
import { cgu } from "@/content/legal";

export const metadata: Metadata = {
  title: `${cgu.title} — MENAO`,
  alternates: { canonical: "/cgu" },
};

// TODO(legal) : version provisoire, à faire valider par l'avocat avant l'ouverture (ADR 0377).
export default function Page() {
  return (
    <LegalPage path="/cgu" title={cgu.title} intro={cgu.intro}>
      <LegalBody document={cgu} />
    </LegalPage>
  );
}
