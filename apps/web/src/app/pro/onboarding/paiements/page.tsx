import { connectAccountStatus, connectRequirementGroups } from "@menao/core";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { formatDay } from "@/lib/format";
import { ConnectStatusPanel } from "./connect-status";

const t = fr.pro.onboarding.connect;

/**
 * Étape 6 — compte de paiement Stripe Connect (paiements directs, ADR 0011). Dit en clair ce que
 * Stripe attend encore (rubriques lisibles, date limite) ou qu'il vérifie les informations.
 */
export default async function PaymentsStepPage({
  searchParams,
}: PageProps<"/pro/onboarding/paiements">) {
  const params = await searchParams;
  const context = await getOnboardingContext();
  const { supabase } = context;
  let { artisan } = context;

  if (artisan.status !== "valide" && artisan.status !== "suspendu") {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }

  // Retour depuis Stripe (ou « Actualiser ») : relit l'état du compte sans attendre le webhook.
  if (params.retour === "1" && artisan.stripe_account_id && !artisan.connect_charges_enabled) {
    await supabase.functions.invoke("connect-onboarding", {
      method: "POST",
      body: { action: "refresh" },
    });
    const { data } = await supabase.from("artisans").select("*").eq("id", artisan.id).single();
    if (data) artisan = data;
  }

  const status = connectAccountStatus({
    hasAccount: artisan.stripe_account_id !== null,
    chargesEnabled: artisan.connect_charges_enabled,
    detailsSubmitted: artisan.connect_details_submitted,
    requirementsDue: artisan.connect_requirements_due,
    requirementsPending: artisan.connect_requirements_pending,
    disabledReason: artisan.connect_disabled_reason,
  });
  return (
    <Card>
      <section aria-labelledby="paiements" className="flex flex-col gap-4">
        <h2 id="paiements" className="text-lg font-medium">
          {fr.pro.onboarding.steps.paiements}
        </h2>
        {params.lien === "expire" && <Alert tone="error">{t.linkExpired}</Alert>}
        <ConnectStatusPanel
          status={status}
          payoutsEnabled={artisan.connect_payouts_enabled}
          due={connectRequirementGroups(artisan.connect_requirements_due)}
          pending={connectRequirementGroups(artisan.connect_requirements_pending)}
          deadline={
            artisan.connect_requirements_deadline
              ? formatDay(artisan.connect_requirements_deadline)
              : null
          }
        />
      </section>
    </Card>
  );
}
