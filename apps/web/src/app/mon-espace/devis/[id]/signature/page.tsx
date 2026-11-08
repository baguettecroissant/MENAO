import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { Eye } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientFlowPage, ClientSteps } from "@/components/chantier/client-steps";
import { QuoteSignatureForm } from "@/components/project/quote-signature-form";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.signature.title} — MENAO` };

/**
 * Signature du devis par le client (F-13), maquettes « Signature du devis » : rappel du devis et
 * de l'échéancier, cases à cocher, puis signature chez le prestataire (code à usage unique).
 */
export default async function QuoteSignaturePage({
  params,
}: PageProps<"/mon-espace/devis/[id]/signature">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/devis/${id}/signature` as Route);
  }
  const { data: document } = await supabase.rpc("quote_document", { p_quote_id: id });
  if (!document) notFound();
  const data = quotePdfData(document as unknown as QuoteDocument);
  const quoteHref = `/mon-espace/devis/${id}`;
  if ((document as unknown as QuoteDocument).quote.status !== "envoye")
    redirect(quoteHref as Route);
  const model = quoteDocumentModel(data);
  const [deposit, balance] = data.schedule;

  // Refonte « Nette » (ADR 0256) : le devis à gauche, les cases et la signature à droite.
  return (
    <ClientFlowPage
      backHref={quoteHref as Route}
      backLabel={t.backToQuote}
      title={t.signature.title}
      lead={t.signature.intro}
      steps={
        <ClientSteps
          label={t.signature.tabs.label}
          steps={[
            { label: t.signature.tabs.sign, state: "current" },
            { label: t.signature.tabs.deposit, state: "todo" },
          ]}
        />
      }
      aside={
        <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <QuoteSignatureForm
            quoteId={id}
            deposit={euros.format((deposit?.amountCents ?? 0) / 100)}
            balance={euros.format((balance?.amountCents ?? 0) / 100)}
          />
          <p className="text-center text-xs text-muted-foreground">{t.signature.depositNext}</p>
        </section>
      }
    >
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        {data.numero && (
          <p className="text-sm font-semibold text-label">
            {t.signature.summary(data.numero, euros.format(data.totals.totalTtcCents / 100))}
          </p>
        )}
        <p className="font-display text-[2.5rem] leading-none font-bold tracking-tight">
          {euros.format(data.totals.totalTtcCents / 100)}
        </p>
        <ul className="flex flex-col divide-y divide-border border-y border-border text-[0.9375rem]">
          {model.scheduleLines.map((line) => (
            <li key={line} className="py-2.5 text-label">
              {line}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{model.datesLine}</p>
        <a
          href={`/devis/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className={`${buttonClasses({ variant: "outline", size: "sm", block: false })} mt-1 self-start`}
        >
          <Eye aria-hidden="true" className="size-4" />
          {t.viewPdf}
          <span className="sr-only"> {t.newTab}</span>
        </a>
      </section>
    </ClientFlowPage>
  );
}
