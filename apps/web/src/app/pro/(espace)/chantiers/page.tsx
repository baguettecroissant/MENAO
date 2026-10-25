import { exampleChantierRows } from "@menao/core";
import type { Metadata } from "next";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";
import { artisanActivity, spaceExamples } from "@/lib/artisan/space";
import { EmptyState } from "@/components/empty-state";
import { ChantierList } from "@/components/pro/chantier-list";
import { SpaceExamplesNotice } from "@/components/pro/examples";

const t = fr.pro.chantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Chantiers de l'artisan (barre de navigation des maquettes : « Chantiers »). Tant que l'artisan
 * n'a rien reçu : chantiers d'exemple (ADR 0184).
 */
export default async function ChantiersPage() {
  const [{ chantiers: rows }, examples] = await Promise.all([artisanActivity(), spaceExamples()]);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {examples ? (
          <>
            <SpaceExamplesNotice />
            <ChantierList rows={exampleChantierRows()} base={EXAMPLES_BASE} example />
          </>
        ) : rows.length === 0 ? (
          <EmptyState illustration="chantiers">{t.empty}</EmptyState>
        ) : (
          <ChantierList rows={rows} />
        )}
      </div>
    </main>
  );
}
