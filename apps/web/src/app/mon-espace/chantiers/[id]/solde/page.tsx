import { paymentProgress } from "@menao/core";
import { ArrowLeft, Check, CircleDashed, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={chantierHref}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
        <nav aria-label={fr.reception.stepsLabel} className="flex border-b border-border">
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 pb-3 text-center text-sm text-success">
            <Check aria-hidden="true" className="size-4" />
            {fr.reception.steps.pv}
          </span>
          <span
            aria-current="step"
            className="flex-1 border-b-2 border-primary pb-3 text-center text-sm font-medium text-primary-strong"
          >
            {fr.reception.steps.solde}
          </span>
        </nav>
        <p className="text-sm text-muted-foreground">{t.intro}</p>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
          <ol className="relative flex flex-col gap-4">
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-3 left-[0.6875rem] w-px bg-border-strong"
            />
            <li className="relative flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-primary bg-primary-soft text-primary-strong"
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                {t.paid}
              </span>
              <span>{euros.format(progress.paidCents / 100)}</span>
            </li>
            <li className="relative flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-primary bg-surface text-primary"
                >
                  <CircleDashed className="size-3.5" />
                </span>
                {t.today}
              </span>
              <span className="text-lg font-medium whitespace-nowrap text-primary">{amount}</span>
            </li>
          </ol>
          <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
            <span>{t.total}</span>
            <span>{euros.format(total / 100)}</span>
          </p>
          <p className="text-sm">{t.beneficiary(company)}</p>
          <p className="text-xs text-muted-foreground">{t.direct}</p>
          <p className="text-xs text-muted-foreground">{fr.clientQuote.deposit.methods}</p>
        </section>

        {c.balance_status === "en_cours" ? (
          <Alert tone="info">{t.inProgress}</Alert>
        ) : (
          <BalancePayButton chantierId={id} amount={amount} />
        )}
        <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          {fr.clientQuote.deposit.secure}
        </p>
      </div>
    </main>
  );
}
