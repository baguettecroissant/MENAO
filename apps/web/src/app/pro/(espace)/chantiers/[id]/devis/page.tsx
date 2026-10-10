import type { QuoteLineInput } from "@menao/validation";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { QuoteEditor } from "@/components/pro/quote-editor";
import { QuoteHeader } from "@/components/pro/quote-header";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.quote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Création du devis (F-19), maquettes « Vue d'une génération de devis ». */
export default async function QuotePage({ params }: PageProps<"/pro/chantiers/[id]/devis">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, artisanId } = await requireProSpace();
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();
  if (c.chantier.status !== "rdv_planifie" && c.chantier.status !== "devis_en_revision") {
    redirect(`/pro/chantiers/${id}` as Route);
  }

  const [{ data: draft }, { data: artisan }, { data: dictation }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_lines(position, type, designation, description, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp)",
      )
      .eq("chantier_id", id)
      .eq("status", "brouillon")
      .maybeSingle(),
    supabase.from("artisans").select("assujetti_tva").eq("id", artisanId).single(),
    supabase.from("quote_dictations").select("transcript").eq("chantier_id", id).maybeSingle(),
  ]);
  const lines: QuoteLineInput[] = [...(draft?.quote_lines ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      type: l.type,
      designation: l.designation,
      description: l.description ?? "",
      quantityMilli: l.quantity_milli,
      unit: l.unit,
      unitPriceHtCents: l.unit_price_ht_cents,
      vatRateBp: l.vat_rate_bp,
    }));
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;

  return (
    <main className="flex flex-1 flex-col">
      <QuoteHeader
        backHref={`/pro/chantiers/${id}`}
        backLabel={t.back}
        title={t.title}
        chantierTitle={c.chantier.title}
        appointmentAt={appointment?.starts_at ?? null}
      />
      <QuoteEditor
        chantierId={id}
        initialLines={lines}
        saved={Boolean(draft)}
        assujettiTva={artisan?.assujetti_tva ?? true}
        savedDictation={dictation?.transcript ?? null}
      />
    </main>
  );
}
