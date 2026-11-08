import { dateLong, quotePdfData, type QuoteDocument } from "@menao/documents";
import { CalendarDays, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientFlowPage, ClientSteps } from "@/components/chantier/client-steps";
import { DepositPayButton } from "@/components/project/deposit-pay-button";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.deposit.title} — MENAO` };

/**
 * Paiement de l'acompte (F-31), maquettes « Paiement de l'acompte » : échéancier, bénéficiaire
 * (l'entreprise de l'artisan), paiement Stripe sur le compte de l'artisan.
 */
export default async function DepositPage({ params }: PageProps<"/mon-espace/devis/[id]/acompte">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/devis/${id}/acompte` as Route);
  }
  const quoteHref = `/mon-espace/devis/${id}`;
  const [{ data: document }, { data: payment }] = await Promise.all([
    supabase.rpc("quote_document", { p_quote_id: id }),
    supabase
      .from("payments")
      .select("status")
      .eq("quote_id", id)
      .eq("kind", "acompte")
      .in("status", ["en_attente", "en_cours", "paye"])
      .maybeSingle(),
  ]);
  if (!document) notFound();
  const doc = document as unknown as QuoteDocument;
  if (doc.quote.status !== "signe" || payment?.status === "paye") redirect(quoteHref as Route);
  const data = quotePdfData(doc);
  const [deposit, balance] = data.schedule;
  const depositAmount = euros.format((deposit?.amountCents ?? 0) / 100);

  // Refonte « Nette » (ADR 0256) : l'échéancier à gauche, le paiement à droite.
  return (
    <ClientFlowPage
      backHref={quoteHref as Route}
      backLabel={t.backToQuote}
      title={t.deposit.title}
      lead={t.deposit.intro}
      steps={
        <ClientSteps
          label={t.signature.tabs.label}
          steps={[
            { label: t.signature.tabs.sign, state: "done" },
            { label: t.signature.tabs.deposit, state: "current" },
          ]}
        />
      }
      aside={
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <span className="text-sm font-semibold text-label">{t.deposit.today}</span>
          <span className="font-display text-[2.75rem] leading-none font-bold tracking-tight">
            {depositAmount}
          </span>
          <p className="border-t border-border pt-3 text-sm">
            {t.deposit.beneficiary(data.issuer.name)}
          </p>
          <p className="text-xs text-muted-foreground">{t.deposit.methods}</p>
          {payment?.status === "en_cours" ? (
            <Alert tone="info">{t.depositInProgress}</Alert>
          ) : (
            <DepositPayButton quoteId={id} amount={depositAmount} />
          )}
          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="size-3.5" />
            {t.deposit.secure}
          </p>
        </section>
      }
    >
      <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="pb-2 text-lg">{t.deposit.scheduleTitle}</h2>
        <dl className="flex flex-col divide-y divide-border border-t border-border">
          <div className="flex items-center gap-3.5 py-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
              <Lock aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <dt className="flex-1 font-bold">{t.deposit.today}</dt>
            <dd className="font-display text-lg font-bold">{depositAmount}</dd>
          </div>
          <div className="flex items-center gap-3.5 py-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-background text-label">
              <CalendarDays aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <dt className="flex-1 font-bold">{t.deposit.later}</dt>
            <dd className="font-display text-lg font-bold">
              {euros.format((balance?.amountCents ?? 0) / 100)}
            </dd>
          </div>
        </dl>
        {data.startDate && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {t.deposit.start(dateLong(data.startDate))}
          </p>
        )}
      </section>
    </ClientFlowPage>
  );
}
