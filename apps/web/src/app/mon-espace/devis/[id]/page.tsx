import { depositAboveAdvice, trancheAmount } from "@menao/core";
import { quoteDocumentModel, quotePdfData, type QuoteDocument } from "@menao/documents";
import { Eye } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { QuoteResponse } from "@/components/project/quote-response";
import { QuotePaper } from "@/components/pro/quote-paper";
import { SheetChip, SheetHeader, SheetPage, SheetRow, sheetCard } from "@/components/pro/sheet";
import { Alert, ButtonLink, TextLink, buttonClasses } from "@/components/ui";
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

  // Conseil au client (ADR 0158) : acompte de plus de 30 %.
  const advisedDeposit = depositAboveAdvice(data.schedule);
  const actions = (
    <>
      {quote.status === "signe" &&
        trancheAmount(data.schedule, "signature") > 0 &&
        deposit?.status !== "paye" &&
        deposit?.status !== "en_cours" && (
          <ButtonLink href={`/mon-espace/devis/${id}/acompte` as Route} size="lg" block>
            {t.payDeposit(euros.format(trancheAmount(data.schedule, "signature") / 100))}
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
    </>
  );
  // Refonte « Nette » (ADR 0251) : en-tête à grand titre, le devis à gauche, le total, l'échéancier
  // et les boutons à droite (dessous sur téléphone).
  return (
    <SheetPage>
      <SheetHeader
        backHref="/mon-espace"
        backLabel={t.back}
        chips={
          <>
            <SheetChip tone={tone[quote.status]} dot>
              {t.statuses[quote.status]}
            </SheetChip>
            {quote.status === "envoye" && quote.valid_until && (
              <SheetChip tone="neutral">{t.validUntil(formatDay(quote.valid_until))}</SheetChip>
            )}
          </>
        }
        title={artisan ? t.title(artisan) : t.titleFallback}
      />
      <div className="grid items-start gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
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
                <TextLink href={`/mon-espace/devis/${newer.id}` as Route}>
                  {t.seeNewVersion}
                </TextLink>
              )}
            </Alert>
          )}
          {advisedDeposit !== null &&
            (quote.status === "envoye" ||
              (quote.status === "signe" &&
                deposit?.status !== "paye" &&
                deposit?.status !== "en_cours")) && (
              <Alert tone="info">{t.depositAdvice(advisedDeposit)}</Alert>
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
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section aria-labelledby="total-devis" className={sheetCard}>
            <div className="flex flex-col gap-1">
              <h2 id="total-devis" className="font-sans text-sm font-semibold text-label">
                {t.totalTtc}
              </h2>
              <span className="font-display text-[2.25rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {euros.format(data.totals.totalTtcCents / 100)}
              </span>
            </div>
            <dl>
              <SheetRow label={t.totalHt}>{euros.format(data.totals.totalHtCents / 100)}</SheetRow>
              <SheetRow label={t.totalTva}>
                {euros.format(data.totals.totalTvaCents / 100)}
              </SheetRow>
            </dl>
            {data.schedule.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl bg-background p-3.5">
                <span className="text-[0.8125rem] font-bold tracking-[0.04em] text-muted-foreground uppercase">
                  {t.toPay}
                </span>
                {data.schedule.map((tranche) => (
                  <div
                    key={`${tranche.trigger}-${tranche.percent}`}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-label">
                      {tranche.trigger === "signature"
                        ? t.trancheSignature(tranche.percent)
                        : t.trancheReception}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {euros.format(tranche.amountCents / 100)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {actions}
          </section>
        </aside>
      </div>
    </SheetPage>
  );
}
