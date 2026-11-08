import { parisToday, paymentProgress } from "@menao/core";
import { receptionPreviewData, type QuoteDocument } from "@menao/documents";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientFlowPage } from "@/components/chantier/client-steps";
import { ReceptionForm } from "@/components/project/reception-form";
import { fr } from "@/i18n/fr";
import { documentLogoUrl } from "@/lib/documents/logo";
import { createClient } from "@/lib/supabase/server";

const t = fr.reception;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Réception des travaux par le client (F-25, F-26) : réserves éventuelles (?reserves=1), aperçu
 * du PV, cases à cocher, puis signature chez le prestataire. Le PV signé fait foi : ses données
 * sont figées par la base à l'ouverture de la signature.
 */
export default async function ReceptionPage({
  params,
  searchParams,
}: PageProps<"/mon-espace/chantiers/[id]/reception">) {
  const { id } = await params;
  const { reserves } = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/chantiers/${id}/reception` as Route);
  }
  const chantierHref = `/mon-espace/chantiers/${id}` as Route;
  const { data: rows } = await supabase.rpc("particulier_chantiers", { p_chantier_id: id });
  const c = rows?.[0];
  if (!c) notFound();
  if (c.status !== "travaux_termines" || !c.quote_id) redirect(chantierHref);

  const [{ data: document }, { data: payments }] = await Promise.all([
    supabase.rpc("quote_document", { p_quote_id: c.quote_id }),
    supabase.from("payments").select("status, amount_cents").eq("quote_id", c.quote_id),
  ]);
  if (!document) notFound();
  const quote = document as unknown as QuoteDocument;
  const progress = paymentProgress(
    quote.quote.total_ttc_cents,
    (payments ?? []).map((p) => ({ status: p.status, amountCents: p.amount_cents })),
  );
  const preview = receptionPreviewData(quote, {
    today: parisToday(),
    finishedOn: c.finished_at ? parisToday(new Date(c.finished_at)) : null,
    signedOn: quote.quote.signed_at ? parisToday(new Date(quote.quote.signed_at)) : null,
    paidCents: progress.paidCents,
  });
  const logoUrl = await documentLogoUrl(supabase, quote.issuer.logo_path);

  // Refonte « Nette » (ADR 0256).
  return (
    <ClientFlowPage backHref={chantierHref} backLabel={t.back} title={t.title} lead={c.title}>
      <ReceptionForm
        chantierId={id}
        preview={preview}
        withReserves={reserves === "1"}
        artisanName={c.artisan_name}
        balance={euros.format(progress.remainingCents / 100)}
        logoUrl={logoUrl}
      />
    </ClientFlowPage>
  );
}
