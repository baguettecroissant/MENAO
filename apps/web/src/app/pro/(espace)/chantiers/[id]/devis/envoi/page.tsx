import { belowMarginAlert, DEFAULT_DEPOSIT_PERCENT, formatRateBp, parisToday } from "@menao/core";
import { quotePdfData, type QuoteDocument } from "@menao/documents";
import { TriangleAlert, User, Wrench } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { DetailBlock } from "@/components/pro/detail";
import { QuoteHeader } from "@/components/pro/quote-header";
import { QuoteSendForm } from "@/components/pro/quote-send-form";
import { Alert, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { marginAlertBp, savedQuoteMargin } from "@/lib/artisan/library";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.quote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.send.title} — MENAO` };

/** Lendemain d'une date AAAA-MM-JJ. */
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * « Envoi du devis » (F-21), maquettes « Envoi du devis » : échéancier, dates des travaux et
 * rattachement au chantier, puis envoi (numéro attribué et devis figé par la base).
 */
export default async function QuoteSendPage({
  params,
}: PageProps<"/pro/chantiers/[id]/devis/envoi">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, artisanId } = await requireTeamPermission("money");
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();
  if (c.chantier.status !== "rdv_planifie" && c.chantier.status !== "devis_en_revision") {
    redirect(`/pro/chantiers/${id}` as Route);
  }

  const editorHref = `/pro/chantiers/${id}/devis`;
  const [{ data: draft }, { data: artisan }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, total_ttc_cents")
      .eq("chantier_id", id)
      .eq("status", "brouillon")
      .maybeSingle(),
    supabase.from("artisans").select("default_deposit_percent").eq("id", artisanId).single(),
  ]);
  const { data: document } = draft
    ? await supabase.rpc("quote_document", { p_quote_id: draft.id })
    : { data: null };
  const quote = document ? quotePdfData(document as unknown as QuoteDocument) : null;
  if (!draft || !quote || quote.lines.length === 0) redirect(editorHref as Route);
  // Mêmes exigences que l'envoi en base (F-20) : assureur, numéro, couverture, non échue.
  const insurance = quote.issuer.insurance;
  const insured = Boolean(insurance?.insurer && insurance.policy && insurance.coverage);
  // Alerte avant l'envoi (ADR 0294) : seulement si l'artisan a fixé un seuil ; l'envoi reste libre.
  const [margin, alertBp] = await Promise.all([
    savedQuoteMargin(supabase, draft.id),
    marginAlertBp(supabase),
  ]);
  const lowMargin = belowMarginAlert(margin.markupBp, alertBp);
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const clientName = [c.client.first_name, c.client.last_name].filter(Boolean).join(" ");

  return (
    <main className="flex flex-1 flex-col">
      <QuoteHeader
        backHref={editorHref}
        backLabel={t.preview.back}
        title={t.title}
        chantierTitle={c.chantier.title}
        appointmentAt={appointment?.starts_at ?? null}
        step="envoi"
        chantierId={id}
        client={[c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || null}
        place={[c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null}
      />
      {!insured && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
          <Alert tone="error">
            {t.send.insuranceMissing}{" "}
            <TextLink href={"/pro/onboarding/documents" as Route}>{t.send.insuranceLink}</TextLink>
          </Alert>
        </div>
      )}
      {lowMargin && margin.markupBp !== null && alertBp !== null && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
          <p
            role="status"
            className="flex items-start gap-2.5 rounded-input border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t.library.below(formatRateBp(margin.markupBp), formatRateBp(alertBp))}</span>
          </p>
        </div>
      )}
      <QuoteSendForm
        quoteId={draft.id}
        totalTtcCents={draft.total_ttc_cents}
        defaultDeposit={artisan?.default_deposit_percent ?? DEFAULT_DEPOSIT_PERCENT}
        minStartDate={nextDay(parisToday())}
      >
        <DetailBlock icon={<User />} title={t.send.client}>
          <div className="flex flex-col gap-0.5 text-sm">
            {clientName && <p className="font-medium">{clientName}</p>}
            {c.client.email && <p>{c.client.email}</p>}
            {c.client.phone && <p>{c.client.phone}</p>}
          </div>
          <p className="text-xs text-primary-strong">{t.send.clientNotice}</p>
        </DetailBlock>
        <DetailBlock icon={<Wrench />} title={t.send.chantier}>
          <p className="text-sm font-medium">{c.chantier.title}</p>
          {c.summary && <p className="text-sm text-muted-foreground">{c.summary}</p>}
        </DetailBlock>
      </QuoteSendForm>
    </main>
  );
}
