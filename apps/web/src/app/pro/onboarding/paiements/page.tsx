import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ConnectButton } from "./connect-button";

const t = fr.pro.onboarding.connect;

/** Étape 6 — compte de paiement Stripe Connect (paiements directs, ADR 0011). */
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

  // Retour depuis Stripe : relit l'état du compte sans attendre le webhook.
  if (params.retour === "1" && artisan.stripe_account_id && !artisan.connect_charges_enabled) {
    await supabase.functions.invoke("connect-onboarding", {
      method: "POST",
      body: { action: "refresh" },
    });
    const { data } = await supabase.from("artisans").select("*").eq("id", artisan.id).single();
    if (data) artisan = data;
  }

  return (
    <Card>
      <section aria-labelledby="paiements" className="flex flex-col gap-4">
        <h2 id="paiements" className="text-lg font-medium">
          {fr.pro.onboarding.steps.paiements}
        </h2>
        {params.lien === "expire" && <Alert tone="error">{t.linkExpired}</Alert>}
        {artisan.connect_charges_enabled ? (
          <>
            <Alert tone="success">{t.active}</Alert>
            {!artisan.connect_payouts_enabled && (
              <p className="text-muted-foreground">{t.payoutsPending}</p>
            )}
            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t.dashboard}
            </a>
          </>
        ) : (
          <>
            <p>{t.intro}</p>
            <p className="text-sm text-muted-foreground">{t.fees}</p>
            {artisan.connect_details_submitted && <p role="status">{t.pending}</p>}
            <ConnectButton label={artisan.stripe_account_id ? t.resume : t.start} />
          </>
        )}
      </section>
    </Card>
  );
}
