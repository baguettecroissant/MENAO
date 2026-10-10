import type { QuoteLineInput } from "@menao/validation";
import { CalendarDays, Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { DetailHeader } from "@/components/pro/detail";
import { QuoteEditor } from "@/components/pro/quote-editor";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import { formatDayLong, formatTime } from "@/lib/format";

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

  const [{ data: draft }, { data: artisan }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_lines(position, type, designation, description, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp)",
      )
      .eq("chantier_id", id)
      .eq("status", "brouillon")
      .maybeSingle(),
    supabase.from("artisans").select("assujetti_tva").eq("id", artisanId).single(),
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
      <DetailHeader backHref={`/pro/chantiers/${id}`} backLabel={t.back} title={t.title}>
        <p className="text-sm text-white/90">{c.chantier.title}</p>
        {appointment && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatDayLong(appointment.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />
              {formatTime(appointment.starts_at)}
            </span>
          </div>
        )}
      </DetailHeader>
      <QuoteEditor
        chantierId={id}
        initialLines={lines}
        saved={Boolean(draft)}
        assujettiTva={artisan?.assujetti_tva ?? true}
      />
    </main>
  );
}
