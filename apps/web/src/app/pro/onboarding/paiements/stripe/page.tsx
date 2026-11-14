import { connectOnboardingOpen } from "@menao/core";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { PaymentHow } from "../payment-how";
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

  // Refonte « Nette » (lot 47, ADR 0316) : le formulaire de Stripe à gauche, comment l'argent
  // arrive à droite, comme l'étape Paiements.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <Card>
        <section aria-labelledby="stripe" className="flex flex-col gap-3.5">
          <h2 id="stripe" className="text-[1.0625rem] font-bold tracking-tight">
            {t.embedded.title}
          </h2>
          <p className="text-[0.90625rem] leading-[1.45] text-label">{t.embedded.lead}</p>
          <div className="rounded-[0.875rem] border border-border p-4 sm:p-5">
            <ConnectEmbedded />
          </div>
          <p className="text-[0.8125rem] text-muted-foreground">{t.embedded.website}</p>
        </section>
      </Card>
      <PaymentHow />
    </div>
  );
}
