import { trancheAmount } from "@menao/core";
import { Check, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientFlowPage } from "@/components/chantier/client-steps";
import { BalancePayButton } from "@/components/project/balance-pay-button";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.startPayment;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

type Tranche = { percent: number; trigger: string; amount_cents: number };

/**
 * Paiement au démarrage des travaux (F-146, maquette lot 40) : carte « Travaux commencés » avec
 * la part prévue, frise de l'échéancier (signature, démarrage, réception), paiement Stripe sur le
 * compte de l'artisan (règle 12). Le montant est celui figé dans le devis signé.
 */
export default async function StartPaymentPage({
  params,
}: PageProps<"/mon-espace/chantiers/[id]/demarrage">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/chantiers/${id}/demarrage` as Route);
  }
  const chantierHref = `/mon-espace/chantiers/${id}` as Route;
  const { data: rows } = await supabase.rpc("particulier_chantiers", { p_chantier_id: id });
  const c = rows?.[0];
  if (!c) notFound();
  const payable =
    (c.status === "en_cours" ||
      c.status === "travaux_termines" ||
      c.status === "reserves_a_lever") &&
    c.quote_id &&
    (c.start_payment_cents ?? 0) > 0 &&
    c.start_payment_status !== "paye";
  if (!payable || !c.quote_id) redirect(chantierHref);
  const [{ data: quote }, { data: issuer }] = await Promise.all([
    supabase.from("quotes").select("payment_schedule").eq("id", c.quote_id).single(),
    supabase.rpc("quote_document", { p_quote_id: c.quote_id }),
  ]);
  const schedule = ((quote?.payment_schedule ?? []) as Tranche[]).map((s) => ({
    trigger: s.trigger,
    percent: s.percent,
    amountCents: s.amount_cents,
  }));
  const startPercent = schedule.find((s) => s.trigger === "demarrage")?.percent ?? 0;
  const depositCents = trancheAmount(schedule, "signature");
  const amount = euros.format((c.start_payment_cents ?? 0) / 100);
  const company =
    (issuer as { issuer?: { raison_sociale?: string | null } } | null)?.issuer?.raison_sociale ??
    c.artisan_name;
  const steps = [
    {
      label: t.steps.signature,
      detail:
        depositCents > 0
          ? c.deposit_status === "paye"
            ? t.depositPaid(euros.format(depositCents / 100))
            : t.depositDue(euros.format(depositCents / 100))
          : t.noDeposit,
      state: "done" as const,
    },
    { label: t.steps.demarrage, detail: t.startNow(amount), state: "now" as const },
    {
      label: t.steps.reception,
      detail: t.balance(euros.format(trancheAmount(schedule, "reception") / 100)),
      state: "todo" as const,
    },
  ];

  return (
    <ClientFlowPage
      backHref={chantierHref}
      backLabel={t.back}
      title={t.title}
      lead={t.intro}
      aside={
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <span className="text-sm font-semibold text-label">{t.today}</span>
          <span className="font-display text-[2.75rem] leading-none font-bold tracking-tight">
            {amount}
          </span>
          <p className="border-t border-border pt-3 text-sm">{t.beneficiary(company)}</p>
          <p className="text-xs text-muted-foreground">{fr.clientQuote.deposit.methods}</p>
          {c.start_payment_status === "en_cours" ? (
            <Alert tone="info">{t.inProgress}</Alert>
          ) : (
            <BalancePayButton chantierId={id} amount={amount} kind="demarrage" />
          )}
          <p className="inline-flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="size-3.5 shrink-0" />
            {t.secure}
          </p>
        </section>
      }
    >
      <section className="flex flex-col gap-2 rounded-card bg-violet-soft p-5 sm:p-6">
        <span className="self-start rounded-pill bg-violet px-2.5 py-1 text-xs font-semibold text-surface">
          {t.chip}
        </span>
        <h2 className="text-xl font-bold">{t.title}</h2>
        <p className="text-[0.9375rem] leading-relaxed text-label">
          {t.started(c.start_at ? formatDayMonth(c.start_at) : null, startPercent)}
        </p>
        <span className="font-display text-[1.875rem] leading-none font-bold tracking-tight">
          {amount}
        </span>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg">{t.scheduleTitle}</h2>
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.label} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`flex size-[1.625rem] shrink-0 items-center justify-center rounded-full ${
                  step.state === "done"
                    ? "bg-success text-surface"
                    : step.state === "now"
                      ? "bg-violet text-surface"
                      : "border-2 border-border-strong"
                }`}
              >
                {step.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="flex flex-col gap-0.5 pt-0.5">
                <span className="text-[0.9375rem] font-bold">{step.label}</span>
                <span className="text-[0.8125rem] text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </ClientFlowPage>
  );
}
