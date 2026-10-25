import { exampleChantierRows } from "@menao/core";
import type { Metadata } from "next";
import { ChantierList } from "@/components/pro/chantier-list";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.chantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Chantiers d'exemple (ADR 0184) : rendez-vous, devis envoyé, travaux en cours. */
export default async function ExampleChantiersPage() {
  await requireExampleViewer();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <ChantierList rows={exampleChantierRows()} base={EXAMPLES_BASE} example />
      </div>
    </main>
  );
}
