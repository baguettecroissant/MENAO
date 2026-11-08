import { exampleChantierRows } from "@menao/core";
import type { Metadata } from "next";
import { ChantiersView } from "@/components/pro/chantiers-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

const t = fr.pro.chantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Chantiers d'exemple (ADR 0184) : rendez-vous, devis envoyé, travaux en cours. */
export default async function ExampleChantiersPage() {
  await requireExampleViewer();
  return (
    <ChantiersView rows={exampleChantierRows()} now={new Date()} base={EXAMPLES_BASE} example />
  );
}
