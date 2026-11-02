import { buttonClasses } from "@/components/ui";

/**
 * Page du formulaire Stripe intégré (ADR 0215). Toujours ouverte par un chargement complet, jamais
 * par une navigation interne : ses en-têtes propres (CSP avec Stripe, fenêtre de connexion Stripe
 * autorisée) ne s'appliquent qu'au document chargé.
 */
export const CONNECT_STRIPE_PATH = "/pro/onboarding/paiements/stripe";

/** Ouvre le formulaire Stripe intégré (lien simple : chargement complet de la page). */
export function ConnectStripeLink({ label }: { label: string }) {
  return (
    <a href={CONNECT_STRIPE_PATH} className={`${buttonClasses()} sm:w-auto sm:self-start sm:px-6`}>
      {label}
    </a>
  );
}
