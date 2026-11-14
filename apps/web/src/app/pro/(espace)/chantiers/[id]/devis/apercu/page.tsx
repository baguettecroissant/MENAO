import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { Eye, FileCheck2 } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { QuoteHeader } from "@/components/pro/quote-header";
import { QuotePaper } from "@/components/pro/quote-paper";
import { ButtonLink, Card, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireTeamPermission } from "@/lib/artisan/space";
import { documentLogoUrl } from "@/lib/documents/logo";

const t = fr.pro.quote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.preview.title} — MENAO` };

/**
 * Aperçu du devis (F-19 « Générer le devis », F-20), maquette « Aperçu du devis » : miniature et
 * PDF du brouillon enregistré. Numéro, validité, dates et échéancier sont fixés à l'envoi (F-21).
 */
export default async function QuotePreviewPage({
  params,
}: PageProps<"/pro/chantiers/[id]/devis/apercu">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireTeamPermission("money");
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();
  if (c.chantier.status !== "rdv_planifie" && c.chantier.status !== "devis_en_revision") {
    redirect(`/pro/chantiers/${id}` as Route);
  }

  const editorHref = `/pro/chantiers/${id}/devis`;
  const { data: draft } = await supabase
    .from("quotes")
    .select("id")
    .eq("chantier_id", id)
    .eq("status", "brouillon")
    .maybeSingle();
  const { data: document } = draft
    ? await supabase.rpc("quote_document", { p_quote_id: draft.id })
    : { data: null };
  const doc = document ? (document as unknown as QuoteDocument) : null;
  const quote = doc ? quotePdfData(doc) : null;
  if (!draft || !doc || !quote || quote.lines.length === 0) redirect(editorHref as Route);
  const logoUrl = await documentLogoUrl(supabase, doc.issuer.logo_path);
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;

  const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const clientName = [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || null;
  const recap: [string, string][] = [
    ...(clientName ? ([[t.preview.recap.client, clientName]] as [string, string][]) : []),
    [t.preview.recap.lines, String(quote.lines.length)],
    [t.preview.recap.totalHt, euros.format(quote.totals.totalHtCents / 100)],
    [t.preview.recap.totalTtc, euros.format(quote.totals.totalTtcCents / 100)],
  ];

  // Refonte « Nette » (lot 46, ADR 0315) : le papier en grand à gauche, le récapitulatif et la
  // suite à droite (plus de barre collante en bas).
  return (
    <main className="flex flex-1 flex-col">
      <QuoteHeader
        backHref={editorHref}
        backLabel={t.preview.back}
        title={t.title}
        chantierTitle={c.chantier.title}
        appointmentAt={appointment?.starts_at ?? null}
        step="apercu"
        chantierId={id}
        client={clientName}
        place={[c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null}
        wide
      />
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:px-10">
        <div className="flex justify-center rounded-card bg-[linear-gradient(160deg,#f4f1ea,#e6e1d4)] p-4 sm:p-8">
          <QuotePaper
            model={quoteDocumentModel(quote)}
            label={t.preview.miniature}
            logoUrl={logoUrl}
          />
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card className="flex flex-col gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
              <FileCheck2 aria-hidden="true" className="size-6" />
            </span>
            <h2 className="font-display text-[1.375rem] font-bold tracking-tight">
              {t.preview.ready}
            </h2>
            <p className="text-[0.90625rem] leading-[1.45] text-label">
              {t.preview.check(c.client.first_name)}
            </p>
            <dl className="flex flex-col text-[0.90625rem]">
              {recap.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-3 border-t border-border py-2.5"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <a
              href={`/devis/${draft.id}/pdf`}
              target="_blank"
              rel="noopener"
              className={`${buttonClasses({ variant: "secondary" })} !rounded-pill`}
            >
              <Eye aria-hidden="true" className="size-4" />
              {t.preview.viewPdf}
              <span className="sr-only">{t.preview.newTab}</span>
            </a>
          </Card>
          <div className="flex flex-col gap-2">
            <ButtonLink
              href={`/pro/chantiers/${id}/devis/envoi` as Route}
              className="!min-h-[3.125rem] !rounded-pill"
            >
              {t.preview.toSend}
            </ButtonLink>
            <p className="text-center text-xs text-muted-foreground">{t.preview.savedNote}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
