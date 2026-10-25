import type { Database } from "@menao/db";
import { invoiceCsvParties, invoicesCsv } from "@menao/documents";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { exampleInvoiceList, exampleQuoteList } from "./example-data";
import { examplesActive } from "./examples";

const t = fr.proInvoices;

type QuoteRow = Database["public"]["Functions"]["artisan_quotes"]["Returns"][number];

/** Devis de l'artisan (brouillons et envoyés), comme la liste du site. */
export type ArtisanQuote = Omit<QuoteRow, "appointment_at" | "sent_at" | "numero"> & {
  appointment_at: string | null;
  sent_at: string | null;
  numero: string | null;
};

/** Devis de l'artisan (`artisan_quotes`, droits du compte). Null en cas d'erreur. */
export async function loadArtisanQuotes(): Promise<ArtisanQuote[] | null> {
  if (examplesActive()) return exampleQuoteList();
  const { data, error } = await supabase.rpc("artisan_quotes");
  return error ? null : ((data ?? []) as ArtisanQuote[]);
}

/** Identifiant artisan du compte connecté (les factures sont filtrées dessus, comme sur le site). */
async function myArtisanId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase.from("artisans").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export type ArtisanInvoice = {
  id: string;
  numero: string;
  kind: "acompte" | "solde";
  issuedOn: string;
  totalTtcCents: number;
  client: string;
  chantier: string;
};

/**
 * Factures de l'artisan (F-35), émises en son nom à chaque paiement, de la plus récente à la plus
 * ancienne, comme sur le site. Null en cas d'erreur.
 */
export async function loadArtisanInvoices(): Promise<ArtisanInvoice[] | null> {
  if (examplesActive()) return exampleInvoiceList();
  const artisanId = await myArtisanId();
  if (!artisanId) return null;
  const { data, error } = await supabase
    .from("invoices")
    .select("id, numero, kind, issued_on, total_ttc_cents, document")
    .eq("artisan_id", artisanId)
    .order("issued_on", { ascending: false })
    .order("numero", { ascending: false });
  if (error) return null;
  return (data ?? []).map((invoice) => {
    const { client, chantier } = invoiceCsvParties(invoice.document);
    return {
      id: invoice.id,
      numero: invoice.numero,
      kind: invoice.kind,
      issuedOn: invoice.issued_on,
      totalTtcCents: invoice.total_ttc_cents,
      client,
      chantier,
    };
  });
}

/**
 * Export des factures pour le comptable (F-35) : même fichier CSV que le site (`invoicesCsv`),
 * écrit dans le cache de l'application puis proposé au partage (e-mail, Fichiers…).
 */
export async function shareInvoicesCsv(): Promise<boolean> {
  try {
    const artisanId = await myArtisanId();
    if (!artisanId || !(await Sharing.isAvailableAsync())) return false;
    const { data, error } = await supabase
      .from("invoices")
      .select("numero, kind, issued_on, total_ht_cents, total_tva_cents, total_ttc_cents, document")
      .eq("artisan_id", artisanId)
      .order("issued_on")
      .order("numero");
    if (error) return false;
    const csv = invoicesCsv(
      t.csv.headers,
      (data ?? []).map((invoice) => ({
        numero: invoice.numero,
        issuedOn: invoice.issued_on,
        kind: t.kinds[invoice.kind],
        ...invoiceCsvParties(invoice.document),
        totalHtCents: invoice.total_ht_cents,
        totalTvaCents: invoice.total_tva_cents,
        totalTtcCents: invoice.total_ttc_cents,
      })),
    );
    const file = new File(Paths.cache, t.csv.filename);
    file.create({ overwrite: true });
    file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
    return true;
  } catch {
    return false;
  }
}
