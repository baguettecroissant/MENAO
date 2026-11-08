import { exampleChantierRows } from "@menao/core";
import type { Metadata } from "next";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";
import { artisanActivity, requireProSpace, spaceExamples } from "@/lib/artisan/space";
import { EmptyState } from "@/components/empty-state";
import { ChantiersView } from "@/components/pro/chantiers-view";
import { SpaceExamplesNotice } from "@/components/pro/examples";

const t = fr.pro.chantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Chantiers de l'artisan (F-18), refonte « Nette » (ADR 0248) : chiffres clés, filtres par phase,
 * liste. Tant que l'artisan n'a rien reçu : chantiers d'exemple (ADR 0184).
 */
export default async function ChantiersPage() {
  const [{ chantiers: rows }, examples, { teamPosition }] = await Promise.all([
    artisanActivity(),
    spaceExamples(),
    requireProSpace(),
  ]);

  return (
    <ChantiersView
      rows={examples ? exampleChantierRows() : rows}
      now={new Date()}
      base={examples ? EXAMPLES_BASE : undefined}
      example={examples}
      notice={examples ? <SpaceExamplesNotice /> : undefined}
      empty={
        !examples && rows.length === 0 ? (
          <EmptyState illustration="chantiers">
            {/* Ouvrier (ADR 0241) : seulement les chantiers qui lui sont attribués. */}
            {teamPosition === "ouvrier" ? fr.pro.dashboard.worker.empty : t.empty}
          </EmptyState>
        ) : undefined
      }
    />
  );
}
