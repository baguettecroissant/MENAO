import { useEffect } from "react";

/**
 * Version web de l'application : le composant Connect de Stripe n'existe que sur iPhone et Android
 * (`stripe-onboarding.native.tsx`). Le lien vers le site de Stripe le remplace aussitôt.
 */
export function StripeOnboarding({
  onUnavailable,
}: {
  onExit: () => void;
  onUnavailable: (message: string | null) => void;
}) {
  useEffect(() => onUnavailable(null), [onUnavailable]);
  return null;
}
