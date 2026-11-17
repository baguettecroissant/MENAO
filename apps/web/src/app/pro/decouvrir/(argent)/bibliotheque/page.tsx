import { exampleLibrary } from "@menao/core";
import type { Metadata } from "next";
import { LibraryView } from "@/components/pro/library-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";
import { pricedLibrary } from "@/lib/artisan/library";

export const metadata: Metadata = { title: `${fr.pro.library.title} — MENAO` };

/**
 * Bibliothèque d'exemple (ADR 0364) : six ouvrages chiffrés avec leur marge (dont un à perte), les
 * fournitures et leurs prix d'achat (dont un ancien), les réglages de chiffrage. Recherche et
 * onglets fonctionnent ; les boutons sont inactifs.
 */
export default async function ExampleLibraryPage({
  searchParams,
}: PageProps<"/pro/decouvrir/bibliotheque">) {
  const { vue, q } = await searchParams;
  await requireExampleViewer();
  const example = exampleLibrary();
  return (
    <LibraryView
      library={{
        onboarded: true,
        seededCount: null,
        ...pricedLibrary(example.settings, example.supplies, example.works, example.components),
      }}
      view={vue === "fournitures" ? "fournitures" : "ouvrages"}
      query={typeof q === "string" ? q.slice(0, 100) : ""}
      metier={null}
      labels={[]}
      base={EXAMPLES_BASE}
      example
    />
  );
}
