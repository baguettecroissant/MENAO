import type { Metadata } from "next";
import { LegalPage } from "@/components/site/content-page";
import { LegalBody } from "@/components/site/legal-body";
import { cgvArtisans } from "@/content/legal";

export const metadata: Metadata = {
  title: `${cgvArtisans.title} — MENAO`,
  alternates: { canonical: "/cgv-artisans" },
};

// TODO(legal) : version provisoire publiée le 22 novembre 2026 à la demande des dirigeants, à faire
// valider par l'avocat (ADR 0383) ; les points tranchés pour publier sont listés dans
// `content/legal/cgv-artisans.ts`.
export default function Page() {
  return (
    <LegalPage path="/cgv-artisans" title={cgvArtisans.title} intro={cgvArtisans.intro}>
      <LegalBody document={cgvArtisans} />
    </LegalPage>
  );
}
