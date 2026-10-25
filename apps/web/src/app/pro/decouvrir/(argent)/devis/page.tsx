import { exampleQuoteRows } from "@menao/core";
import type { Metadata } from "next";
import { QuoteList } from "@/components/pro/quote-list";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.quote.list.title} — MENAO` };

/** Devis d'exemple (ADR 0184) : brouillon à envoyer, devis envoyé, devis signé. */
export default async function ExampleQuotesPage({
  searchParams,
}: PageProps<"/pro/decouvrir/devis">) {
  const { onglet } = await searchParams;
  await requireExampleViewer();
  return (
    <QuoteList
      quotes={exampleQuoteRows()}
      tab={onglet === "envoyes" ? "envoyes" : "a-envoyer"}
      base={EXAMPLES_BASE}
      example
    />
  );
}
