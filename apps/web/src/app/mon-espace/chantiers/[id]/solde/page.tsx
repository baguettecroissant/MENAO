import { paymentProgress } from "@menao/core";
import { Check, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientFlowPage, ClientSteps } from "@/components/chantier/client-steps";
import { BalancePayButton } from "@/components/project/balance-pay-button";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.balance;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Paiement du solde (F-32), maquettes « Paiement du solde » : échéancier (déjà payé, à payer
 * aujourd'hui), bénéficiaire (l'entreprise de l'artisan), paiement Stripe sur son compte. Le
 * montant est calculé par la base à l'ouverture du paiement (total − acomptes).
 */
export default async function BalancePage({
  params,
}: PageProps<"/mon-espace/chantiers/[id]/solde">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/chantiers/${id}/solde` as Route);
  }
  const chantierHref = `/mon-espace/chantiers/${id}` as Route;
  const { data: rows } = await supabase.rpc("particulier_chantiers", { p_chantier_id: id });
  const c = rows?.[0];
  if (!c) notFound();
  if (c.status !== "receptionne" || !c.quote_id || c.balance_status === "paye") {
    redirect(chantierHref);
  }
  const [{ data: quote }, { data: payments }, { data: issuer }] = await Promise.all([
    supabase.from("quotes").select("total_ttc_cents").eq("id", c.quote_id).single(),
    supabase.from("payments").select("status, amount_cents").eq("quote_id", c.quote_id),
    supabase.rpc("quote_document", { p_quote_id: c.quote_id }),
  ]);
  const total = quote?.total_ttc_cents ?? 0;
  const progress = paymentProgress(
    total,
    (payments ?? []).map((p) => ({ status: p.status, amountCents: p.amount_cents })),
  );
  const company =
    (issuer as { issuer?: { raison_sociale?: string | null } } | null)?.issuer?.raison_sociale ??
    c.artisan_name;
  const amount = euros.format(progress.remainingCents / 100);

  // Refonte « Nette » (ADR 0256) : le chantier à gauche, le paiement à droite.
  return (
    <ClientFlowPage
      backHref={chantierHref}
      backLabel={t.back}
      title={t.title}
      lead={t.intro}
      steps={
        <ClientSteps
          label={fr.reception.stepsLabel}
          steps={[
            { label: fr.reception.steps.pv, state: "done" },
            { label: fr.reception.steps.solde, state: "current" },
            { label: fr.reception.steps.avis, state: "todo" },
          ]}
        />
      }
      aside={
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <span className="text-sm font-semibold text-label">{t.today}</span>
          <span className="font-display text-[2.75rem] leading-none font-bold tracking-tight">
            {amount}
          </span>
          <p className="border-t border-border pt-3 text-sm">{t.beneficiary(company)}</p>
          <p className="text-xs text-muted-foreground">{t.direct}</p>
          <p className="text-xs text-muted-foreground">{fr.clientQuote.deposit.methods}</p>
          {c.balance_status === "en_cours" ? (
            <Alert tone="info">{t.inProgress}</Alert>
          ) : (
            <BalancePayButton chantierId={id} amount={amount} />
          )}
          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="size-3.5" />
            {fr.clientQuote.deposit.secure}
          </p>
        </section>
      }
    >
      <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="pb-2 text-lg">{t.summaryTitle}</h2>
        <dl className="flex flex-col divide-y divide-border border-t border-border text-[0.9375rem]">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-muted-foreground">{t.total}</dt>
            <dd className="font-semibold">{euros.format(total / 100)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Check aria-hidden="true" className="size-4 text-success" />
              {t.paid}
            </dt>
            <dd className="font-semibold">{euros.format(progress.paidCents / 100)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="font-bold">{t.today}</dt>
            <dd className="font-display text-lg font-bold">{amount}</dd>
          </div>
        </dl>
      </section>
    </ClientFlowPage>
  );
}
