import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteResponse } from "@/components/project/quote-response";
import { QuotePaper } from "@/components/pro/quote-paper";
import { Alert, ButtonLink, StatusBadge, TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { documentLogoUrl } from "@/lib/documents/logo";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const tone = {
  brouillon: "neutral",
  envoye: "primary",
  signe: "success",
  refuse: "danger",
  revision_demandee: "warning",
  remplace: "neutral",
} as const;

export const metadata: Metadata = { title: `${t.titleFallback} — MENAO` };

/**
 * Devis reçu par le client (F-21) : contenu figé à l'envoi, PDF, puis demande de modification ou
 * refus. quote_document ne renvoie rien aux autres comptes.
 */
export default async function ClientQuotePage({
  params,
  searchParams,
}: PageProps<"/mon-espace/devis/[id]">) {
  const { id } = await params;
  const { signature, paiement } = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous)
    redirect(`/connexion?next=/mon-espace/devis/${id}` as Route);

  const [{ data: document }, { data: quote }, { data: deposit }, { data: invoice }] =
    await Promise.all([
      supabase.rpc("quote_document", { p_quote_id: id }),
      supabase
        .from("quotes")
        .select("id, status, valid_until, client_message, signed_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("status, amount_cents, paid_at")
        .eq("quote_id", id)
        .eq("kind", "acompte")
        .in("status", ["en_attente", "en_cours", "paye"])
        .maybeSingle(),
      supabase
        .from("invoices")
        .select("id, numero")
        .eq("quote_id", id)
        .eq("kind", "acompte")
        .maybeSingle(),
    ]);
  if (!document || !quote || quote.status === "brouillon") notFound();
  const doc = document as unknown as QuoteDocument;
  const data = quotePdfData(doc);
  const { data: newer } =
    quote.status === "remplace"
      ? await supabase
          .from("quotes")
          .select("id")
          .eq("supersedes_id", id)
          .neq("status", "brouillon")
          .maybeSingle()
      : { data: null };
  const artisan = data.issuer.tradeName ?? data.issuer.name;
  const logoUrl = await documentLogoUrl(supabase, doc.issuer.logo_path);

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/mon-espace"
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {artisan ? t.title(artisan) : t.titleFallback}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={tone[quote.status]}>{t.statuses[quote.status]}</StatusBadge>
            {quote.status === "envoye" && quote.valid_until && (
              <span className="text-sm text-muted-foreground">
                {t.validUntil(formatDay(quote.valid_until))}
              </span>
            )}
          </div>
        </div>
        {quote.status === "envoye" && signature === "terminee" && (
          <Alert tone="info">{t.signatureReturned}</Alert>
        )}
        {quote.status === "signe" && quote.signed_at && (
          <Alert tone="success">{t.signedNotice(formatDay(quote.signed_at))}</Alert>
        )}
        {deposit?.status === "paye" && deposit.paid_at ? (
          <Alert tone="success">
            {t.depositPaid(euros.format(deposit.amount_cents / 100), formatDay(deposit.paid_at))}{" "}
            {invoice && (
              <a
                href={`/factures/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener"
                className="font-medium underline-offset-2 hover:underline"
              >
                {t.depositInvoice(invoice.numero)}
              </a>
            )}
          </Alert>
        ) : deposit?.status === "en_cours" ? (
          <Alert tone="info">{t.depositInProgress}</Alert>
        ) : (
          quote.status === "signe" &&
          paiement === "termine" && <Alert tone="info">{t.paymentReturned}</Alert>
        )}
        {quote.status === "revision_demandee" && (
          <Alert tone="info">
            {t.revisionNotice} {quote.client_message}
          </Alert>
        )}
        {quote.status === "refuse" && <Alert tone="info">{t.refusedNotice}</Alert>}
        {quote.status === "remplace" && (
          <Alert tone="info">
            {t.replacedNotice}{" "}
            {newer && (
              <TextLink href={`/mon-espace/devis/${newer.id}` as Route}>{t.seeNewVersion}</TextLink>
            )}
          </Alert>
        )}
        <QuotePaper
          model={quoteDocumentModel(data)}
          label={t.document}
          clipped={false}
          logoUrl={logoUrl}
        />
        <a
          href={`/devis/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className={`${buttonClasses({ variant: "outline", block: false })} self-start`}
        >
          <Eye aria-hidden="true" className="size-4" />
          {quote.status === "signe" ? t.downloadSigned : t.viewPdf}
          <span className="sr-only"> {t.newTab}</span>
        </a>
        {quote.status === "signe" &&
          deposit?.status !== "paye" &&
          deposit?.status !== "en_cours" && (
            <ButtonLink href={`/mon-espace/devis/${id}/acompte` as Route} size="lg" block>
              {t.payDeposit(euros.format((data.schedule[0]?.amountCents ?? 0) / 100))}
            </ButtonLink>
          )}
        {quote.status === "envoye" && (
          <div className="flex flex-col gap-3">
            <ButtonLink href={`/mon-espace/devis/${id}/signature` as Route} size="lg" block>
              {t.sign}
            </ButtonLink>
            <QuoteResponse quoteId={id} />
          </div>
        )}
      </div>
    </main>
  );
}
