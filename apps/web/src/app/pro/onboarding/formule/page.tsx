import { GuideStepBar } from "@/components/pro/guide-step-bar";
import {
  annualPriceCents,
  parisDay,
  parseAiAgents,
  parseClientReminders,
  planChoiceOpen,
  planMonthlyRequests,
  subscriptionTermSummary,
} from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import {
  AiAgentsCard,
  RecentCallsCard,
  SecretaryLinkCard,
  VoiceMinutesCard,
} from "@/components/pro/ai-agents-card";
import { ClientRemindersCard } from "@/components/pro/client-reminders-card";
import { Alert, Card, StatusBadge, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ManageSubscription, PlanCheckout } from "./plan-forms";
import { PaymentsSoonCard } from "@/components/site/launch-notice";
import { paymentsOpen } from "@/lib/launch";

const t = fr.pro.onboarding.plans;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
/** Jour civil (AAAA-MM-JJ) écrit en toutes lettres. */
const civil = (d: string) => day.format(new Date(`${d}T12:00:00Z`));
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Étape 7 — formule et abonnement (Stripe Billing, web uniquement) : abonnement d'un an payé chaque
 * mois ou d'avance (ADR 0200, ADR 0383). Une fois souscrit, « Ma formule » montre les dates qui
 * comptent et le lien pour arrêter, dans MENAO.
 */
export default async function PlanStepPage(props: PageProps<"/pro/onboarding/formule">) {
  return (
    <>
      <PlanStepContent {...props} />
      {/* Parcours guidé (ADR 0376) : continuer, ou remettre l'étape à plus tard. */}
      <GuideStepBar step="formule" />
    </>
  );
}

async function PlanStepContent({ searchParams }: PageProps<"/pro/onboarding/formule">) {
  const params = await searchParams;
  const { supabase, artisan, subscription, snapshot } = await getOnboardingContext();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "code, nom, accroche, prix_mensuel_ht_centimes, avantages, ouverte, recommandee, limites",
    )
    .order("ordre");

  // Avant la validation : la formule se choisit et se paie déjà (ADR 0353, ADR 0370), rien n'est
  // prélevé pendant l'essai.
  const choosing = planChoiceOpen(artisan.status) && !subscription;
  if (artisan.status !== "valide" && !choosing && !subscription) {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }

  if (subscription) {
    const plan = plans?.find((p) => p.code === subscription.plan_code);
    const { data: agents } = await supabase.rpc("my_ai_agents");
    const agentsState = parseAiAgents(agents);
    // Recharges de minutes (ADR 0233) : offre et prochaine échéance.
    const { data: topUps } = agentsState.agents.topUps
      ? await supabase.rpc("my_voice_topups")
      : { data: null };
    const topUpData = (topUps ?? null) as {
      prochaine_echeance?: string | null;
      offres?: {
        code: string;
        minutes: number;
        prix_ht_centimes: number;
        validite_mois: number;
      }[];
    } | null;
    const firstOffer = topUpData?.offres?.[0];
    // Rappels aux clients par SMS (ADR 0239), si inclus.
    const { data: reminders } =
      agentsState.agents.reminders !== "non"
        ? await supabase.rpc("my_client_reminders")
        : { data: null };
    const remindersState = reminders ? parseClientReminders(reminders) : null;
    const status = subscription.status as keyof typeof t.status;
    // Engagement d'un an (ADR 0383) : les dates qui comptent, calculées dans le cœur.
    const term = subscriptionTermSummary({
      engaged: Boolean(subscription.engagement_version),
      status: subscription.status,
      trialEnd: subscription.trial_end,
      goLiveAt: subscription.essai_demarre_le,
      stopLastDay: subscription.arret_effet_le,
      today: parisDay(new Date()),
    });
    const label =
      term.phase === "awaitingGoLive"
        ? t.term.awaitingStatus
        : term.phase === "trial"
          ? t.term.trialStatus(civil(term.trialLastDay))
          : status === "trialing"
            ? t.status.trialing(
                subscription.trial_end ? day.format(new Date(subscription.trial_end)) : "—",
              )
            : status === "active"
              ? t.status.active(
                  subscription.current_period_end
                    ? day.format(new Date(subscription.current_period_end))
                    : "—",
                )
              : t.status[status];
    const termRows: [string, string][] =
      term.phase === "awaitingGoLive"
        ? [[t.term.engagementRow, t.term.awaitingEngagement]]
        : term.phase === "trial"
          ? [
              [t.term.firstPaymentRow, civil(term.firstPaymentDay)],
              [
                t.term.engagementRow,
                t.term.fromTo(civil(term.firstPaymentDay), civil(term.termLastDay)),
              ],
              [t.term.renounceRow, t.term.before(civil(term.firstPaymentDay))],
            ]
          : term.phase === "engaged"
            ? [
                [t.term.engagementRow, t.term.until(civil(term.termLastDay))],
                [t.term.renewalRow, t.term.renewalOn(civil(term.renewal))],
                [t.term.stopRow, t.term.stopBy(civil(term.cancelDeadline))],
              ]
            : term.phase === "stopping"
              ? [[t.term.stoppingRow, t.term.stoppingOn(civil(term.stopLastDay))]]
              : [];
    const canStop =
      term.phase !== "stopping" &&
      ["trialing", "active", "past_due"].includes(subscription.status) &&
      !subscription.cancel_at_period_end &&
      !subscription.cancel_at;
    const healthy = snapshot.subscriptionActive && status !== "past_due";
    const monthlyCents = plan?.prix_mensuel_ht_centimes ?? null;
    // Refonte « Nette » (lot 46, ADR 0315) : la formule et ses agents à gauche, les minutes de
    // voix, les derniers appels et la secrétaire à droite.
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {params.arret === "ok" && <Alert tone="success">{t.term.stopped}</Alert>}
          <Card className="flex flex-col gap-3">
            <section aria-labelledby="abonnement" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span
                    aria-hidden="true"
                    className="text-[0.8125rem] font-semibold tracking-[0.04em] text-muted-foreground uppercase"
                  >
                    {t.current}
                  </span>
                  <h2
                    id="abonnement"
                    className="font-display text-[1.875rem] leading-none font-bold tracking-tight"
                  >
                    <span className="sr-only">{t.current} : </span>
                    {plan?.nom ?? "—"}
                  </h2>
                </div>
                <StatusBadge tone={healthy ? "success" : "danger"}>
                  {t.statusShort[status] ?? t.statusShort.other}
                </StatusBadge>
              </div>
              <dl className="flex flex-col text-[0.90625rem]">
                <div className="flex justify-between gap-3 border-t border-border py-2.5">
                  <dt className="text-muted-foreground">{t.statusRow}</dt>
                  <dd
                    role="status"
                    className={`text-right font-semibold ${healthy ? "" : "text-danger"}`}
                  >
                    {label}
                  </dd>
                </div>
                {monthlyCents !== null && (
                  <div className="flex justify-between gap-3 border-t border-border py-2.5">
                    <dt className="text-muted-foreground">{t.paymentRow}</dt>
                    <dd className="text-right font-semibold">
                      {subscription.periodicite === "annuel"
                        ? t.paymentYearly(euros.format(annualPriceCents(monthlyCents) / 100))
                        : t.paymentMonthly(euros.format(monthlyCents / 100))}
                    </dd>
                  </div>
                )}
                {termRows.map(([dt, dd]) => (
                  <div
                    key={dt}
                    className="flex justify-between gap-3 border-t border-border py-2.5"
                  >
                    <dt className="text-muted-foreground">{dt}</dt>
                    <dd className="text-right font-semibold">{dd}</dd>
                  </div>
                ))}
              </dl>
              {term.phase === "legacy" &&
                subscription.periodicite === "annuel" &&
                (status === "trialing" && subscription.trial_end ? (
                  <p className="text-sm text-muted-foreground">
                    {t.yearlyTrial(day.format(new Date(subscription.trial_end)))}
                  </p>
                ) : status === "active" &&
                  subscription.current_period_end &&
                  !subscription.cancel_at_period_end ? (
                  <p className="text-sm text-muted-foreground">
                    {t.yearlyActive(day.format(new Date(subscription.current_period_end)))}
                  </p>
                ) : null)}
              {term.phase === "legacy" &&
                subscription.cancel_at_period_end &&
                subscription.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    {t.cancelAtPeriodEnd(day.format(new Date(subscription.current_period_end)))}
                  </p>
                )}
              {/* Espace de facturation Stripe fermé jusqu'au lancement (ADR 0387). */}
              {paymentsOpen && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <ManageSubscription />
                  <p className="min-w-0 flex-1 text-[0.8125rem] text-muted-foreground">
                    {t.manageHint}
                  </p>
                </div>
              )}
              {canStop && (
                <Link
                  href={"/pro/onboarding/formule/arreter" as Route}
                  className={`self-start rounded-sm text-sm font-semibold text-muted-foreground underline hover:text-foreground ${focusRing}`}
                >
                  {t.term.stopLink}
                </Link>
              )}
            </section>
          </Card>
          <AiAgentsCard
            state={agentsState}
            planName={snapshot.subscriptionActive ? (plan?.nom ?? null) : null}
          />
          {remindersState?.included && <ClientRemindersCard state={remindersState} />}
        </div>
        <div className="flex flex-col gap-4">
          <VoiceMinutesCard
            state={agentsState}
            topUp={
              // Recharges fermées jusqu'au lancement (ADR 0387).
              topUpData && paymentsOpen
                ? {
                    offer: firstOffer
                      ? {
                          code: firstOffer.code,
                          minutes: firstOffer.minutes,
                          priceCents: firstOffer.prix_ht_centimes,
                          months: firstOffer.validite_mois,
                        }
                      : null,
                    nextExpiry: topUpData.prochaine_echeance ?? null,
                  }
                : null
            }
            topUpDone={params.recharge === "ok"}
          />
          <RecentCallsCard state={agentsState} />
          {/* Secrétaire dédiée : sa propre rubrique dans le menu (ADR 0244). */}
          {agentsState.agents.secretary && <SecretaryLinkCard />}
        </div>
      </div>
    );
  }

  // Formule et carte fermées jusqu'au lancement (ADR 0387).
  if (!paymentsOpen) return <PaymentsSoonCard />;

  const openPlans = (plans ?? []).filter((p) => p.ouverte);
  const chosenCode = openPlans.some((p) => p.code === artisan.plan_choisi)
    ? artisan.plan_choisi
    : (openPlans.find((p) => p.recommandee)?.code ?? null);
  return (
    <div className="flex flex-col gap-6">
      {params.paiement === "ok" && <Alert tone="success">{t.processing}</Alert>}
      <p className="max-w-3xl text-label">{choosing ? t.choice.intro : t.intro}</p>
      {/* Formule et carte, avec l'engagement d'un an (ADR 0383, maquette du lot 74). */}
      <PlanCheckout
        plans={openPlans.map((p) => ({
          code: p.code,
          nom: p.nom,
          accroche: p.accroche,
          monthlyCents: p.prix_mensuel_ht_centimes,
          featured: p.recommandee,
          requests: planMonthlyRequests(p.limites),
        }))}
        defaultCode={chosenCode}
      />
      <p className="text-sm text-muted-foreground">{t.vatNote}</p>
    </div>
  );
}
