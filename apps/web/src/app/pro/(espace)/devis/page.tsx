import type { Metadata } from "next";
import { QuoteList } from "@/components/pro/quote-list";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.quote.list.title} — MENAO` };

/** Devis de l'artisan (maquettes « Devis – Aucun » et « Devis envoyés »). */
export default async function QuotesPage({ searchParams }: PageProps<"/pro/devis">) {
  const { onglet, envoye } = await searchParams;
  const { supabase } = await requireProSpace();
  const { data } = await supabase.rpc("artisan_quotes");
  const quotes = data ?? [];
  // Retour de « Envoyer le devis » (maquette « Devis envoyé »).
  const justSent = quotes.find((q) => q.quote_id === envoye && q.status === "envoye");
  return (
    <QuoteList
      quotes={quotes}
      tab={onglet === "envoyes" ? "envoyes" : "a-envoyer"}
      justSentTo={justSent ? justSent.client_name : null}
    />
  );
}
