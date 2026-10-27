import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  firstPaymentDate,
  monthlyEquivalentCents,
} from "@menao/core";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ChoosePlan, ManageSubscription } from "./plan-forms";

const t = fr.pro.onboarding.plans;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Étape 7 — formule et abonnement (Stripe Billing, web uniquement) : au mois sans engagement ou à
 * l'année payée d'avance (ADR 0200), engagement et date du premier paiement affichés avant de payer.
 */
export default async function PlanStepPage({ searchParams }: PageProps<"/pro/onboarding/formule">) {
  const params = await searchParams;
  const { supabase, artisan, subscription, snapshot } = await getOnboardingContext();
  const { data: plans } = await supabase
    .from("plans")
    .select("code, nom, prix_mensuel_ht_centimes, avantages, ouverte, recommandee")
    .order("ordre");

  if (artisan.status !== "valide") {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }

  if (subscription) {
    const plan = plans?.find((p) => p.code === subscription.plan_code);
    const status = subscription.status as keyof typeof t.status;
    const label =
      status === "trialing"
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
    return (
      <Card>
        <section aria-labelledby="abonnement" className="flex flex-col gap-3">
          <h2 id="abonnement" className="text-lg font-medium">
            {t.current} : {plan?.nom ?? "—"}
          </h2>
          <p
            role="status"
            className={
              snapshot.subscriptionActive && status !== "past_due" ? "text-success" : "text-danger"
            }
          >
            {label}
          </p>
          {subscription.periodicite === "annuel" &&
            (status === "trialing" && subscription.trial_end ? (
              <p className="text-muted-foreground">
                {t.yearlyTrial(day.format(new Date(subscription.trial_end)))}
              </p>
            ) : status === "active" &&
              subscription.current_period_end &&
              !subscription.cancel_at_period_end ? (
              <p className="text-muted-foreground">
                {t.yearlyActive(day.format(new Date(subscription.current_period_end)))}
              </p>
            ) : null)}
          {subscription.cancel_at_period_end && subscription.current_period_end && (
            <p className="text-muted-foreground">
              {t.cancelAtPeriodEnd(day.format(new Date(subscription.current_period_end)))}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t.manageHint}</p>
          <ManageSubscription />
        </section>
      </Card>
    );
  }

  const firstPayment = day.format(firstPaymentDate());
  return (
    <div className="flex flex-col gap-6">
      {params.paiement === "ok" && <Alert tone="success">{t.processing}</Alert>}
      <p>{t.intro(firstPayment)}</p>
      <ul className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <li key={plan.code}>
            <Card>
              <section aria-labelledby={`plan-${plan.code}`} className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 id={`plan-${plan.code}`} className="text-lg font-medium">
                    {plan.nom}
                  </h2>
                  {/* Formule mise en avant (ADR 0200). */}
                  {plan.recommandee && (
                    <span className="rounded-pill bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {t.recommended}
                    </span>
                  )}
                </div>
                <p>
                  <span className="text-3xl font-medium tracking-tight">
                    {t.priceHt(euros.format(plan.prix_mensuel_ht_centimes / 100))}
                  </span>{" "}
                  <span className="text-muted-foreground">{t.perMonth}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.yearlyAlt(
                    euros.format(annualPriceCents(plan.prix_mensuel_ht_centimes) / 100),
                    euros.format(
                      monthlyEquivalentCents(annualPriceCents(plan.prix_mensuel_ht_centimes)) / 100,
                    ),
                  )}
                </p>
                {plan.ouverte && (
                  <span className="self-start rounded-chip bg-success-soft px-3 py-1 text-sm text-success">
                    {t.trialBadge}
                  </span>
                )}
                <ul className="flex grow flex-col gap-1 text-sm">
                  {(Array.isArray(plan.avantages) ? plan.avantages : []).map((a) => (
                    <li key={String(a)}>✓ {String(a)}</li>
                  ))}
                </ul>
                {plan.ouverte ? (
                  <ChoosePlan code={plan.code} nom={plan.nom} />
                ) : (
                  <p className="text-center text-muted-foreground">{t.soon}</p>
                )}
              </section>
            </Card>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li>{t.monthlyNote}</li>
        <li>{t.yearlyNote(ENGAGEMENT_MONTHS, ANNUAL_FREE_MONTHS, firstPayment)}</li>
        <li>
          {t.guaranteeNote(
            ENGAGEMENT_GUARANTEE.minRequests,
            ENGAGEMENT_GUARANTEE.consecutiveMonths,
          )}
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">{t.vatNote}</p>
    </div>
  );
}
