import { connectOnboardingOpen } from "@menao/core";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ConnectEmbedded } from "./connect-embedded";

const t = fr.pro.onboarding.connect;

/**
 * Formulaire Stripe intégré à MENAO (ADR 0215). Page toujours chargée en entier (lien simple) :
 * ses en-têtes autorisent Stripe dans la CSP et la fenêtre de connexion Stripe (next.config).
 */
export default async function ConnectStripePage() {
  const { artisan } = await getOnboardingContext();
  if (!connectOnboardingOpen(artisan.status)) {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }
  // Compte actif sans rien à fournir : retour à l'étape Paiements.
  if (
    artisan.connect_charges_enabled &&
    artisan.connect_payouts_enabled &&
    artisan.connect_requirements_due.length === 0
  )
    redirect("/pro/onboarding/paiements");

  return (
    <Card>
      <section aria-labelledby="stripe" className="flex flex-col gap-4">
        <h2 id="stripe" className="text-lg font-medium">
          {fr.pro.onboarding.steps.paiements}
        </h2>
        <p className="text-sm text-muted-foreground">{t.embedded.lead}</p>
        <ConnectEmbedded />
      </section>
    </Card>
  );
}
