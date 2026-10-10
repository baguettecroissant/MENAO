import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { Eye, FileCheck2 } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { StickyActions } from "@/components/pro/detail";
import { QuoteHeader } from "@/components/pro/quote-header";
import { QuotePaper } from "@/components/pro/quote-paper";
import { QuoteTabs } from "@/components/pro/quote-tabs";
import { ButtonLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";

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
  const { supabase } = await requireProSpace();
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
  const quote = document ? quotePdfData(document as unknown as QuoteDocument) : null;
  if (!draft || !quote || quote.lines.length === 0) redirect(editorHref as Route);
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;

  return (
    <main className="flex flex-1 flex-col">
      <QuoteHeader
        backHref={editorHref}
        backLabel={t.preview.back}
        title={t.title}
        chantierTitle={c.chantier.title}
        appointmentAt={appointment?.starts_at ?? null}
      />
      <QuoteTabs chantierId={id} active="apercu" />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
            <FileCheck2 aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-xl font-medium">{t.preview.ready}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t.preview.check(c.client.first_name)}
          </p>
        </div>
        <QuotePaper model={quoteDocumentModel(quote)} label={t.preview.miniature} />
        <a
          href={`/devis/${draft.id}/pdf`}
          target="_blank"
          rel="noopener"
          className={buttonClasses({ variant: "outline", block: false })}
        >
          <Eye aria-hidden="true" className="size-4" />
          {t.preview.viewPdf}
          <span className="sr-only">{t.preview.newTab}</span>
        </a>
      </div>
      <StickyActions>
        <ButtonLink href={`/pro/chantiers/${id}/devis/envoi` as Route} size="lg" block>
          {t.next}
        </ButtonLink>
        <p className="text-center text-xs text-muted-foreground">{t.preview.savedNote}</p>
      </StickyActions>
    </main>
  );
}
