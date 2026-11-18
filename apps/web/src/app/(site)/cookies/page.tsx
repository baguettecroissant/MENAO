import type { Metadata } from "next";
import { LegalPage } from "@/components/site/content-page";
import { LegalBody } from "@/components/site/legal-body";
import { cookies } from "@/content/legal";

export const metadata: Metadata = {
  title: `${cookies.title} — MENAO`,
  alternates: { canonical: "/cookies" },
};

// TODO(legal) : version provisoire, à faire valider par l'avocat avant l'ouverture (ADR 0377).
export default function Page() {
  return (
    <LegalPage path="/cookies" title={cookies.title} intro={cookies.intro}>
      <LegalBody document={cookies} />
    </LegalPage>
  );
}
