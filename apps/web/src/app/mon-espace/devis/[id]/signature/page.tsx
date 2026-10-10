import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={quoteHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.backToQuote}
        </Link>
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
          {t.signature.title}
        </h1>
        <nav aria-label={t.signature.tabs.label} className="flex border-b border-border">
          <span
            aria-current="step"
            className="flex-1 border-b-2 border-primary pb-3 text-center text-sm font-medium text-primary-strong"
          >
            {t.signature.tabs.sign}
          </span>
          <span className="flex-1 pb-3 text-center text-sm text-subtle-foreground">
            {t.signature.tabs.deposit}
          </span>
        </nav>
        <p className="text-sm text-muted-foreground">{t.signature.intro}</p>

        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
          {data.numero && (
            <p className="font-medium">
              {t.signature.summary(data.numero, euros.format(data.totals.totalTtcCents / 100))}
            </p>
          )}
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {model.scheduleLines.map((line) => (
              <li key={line}>• {line}</li>
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

        <QuoteSignatureForm
          quoteId={id}
          deposit={euros.format((deposit?.amountCents ?? 0) / 100)}
          balance={euros.format((balance?.amountCents ?? 0) / 100)}
        />
        <p className="text-center text-xs text-muted-foreground">{t.signature.depositNext}</p>
      </div>
    </main>
  );
}
