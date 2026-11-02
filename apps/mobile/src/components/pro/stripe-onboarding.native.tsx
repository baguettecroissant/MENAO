import { stripeConnectAppearance } from "@menao/ui-tokens";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/stripe-react-native";
import { useEffect, useState } from "react";
import { fr } from "@/i18n/fr";
import { openConnectSession } from "@/lib/payments";

const t = fr.proPayments.embedded;

/**
 * Police du système dans le formulaire Stripe : celle de l'application est intégrée à l'app, et
 * Stripe ne charge que des fichiers en ligne (pas d'appel à Google depuis le téléphone).
 */
const FONT_FAMILY = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

/**
 * Formulaire d'inscription Stripe dans l'application (composant Connect natif de
 * `@stripe/stripe-react-native`, ADR 0215), en plein écran, aux couleurs de MENAO. La connexion à
 * Stripe s'ouvre dans la fenêtre sécurisée du téléphone (imposée par Stripe). Il demande tout ce
 * que Stripe exigera, même plus tard. En cas d'échec, `onUnavailable` : lien vers le site de Stripe.
 */
export function StripeOnboarding({
  onExit,
  onUnavailable,
}: {
  /** L'artisan a fermé le formulaire (terminé ou non) : relire l'état du compte. */
  onExit: () => void;
  /** Formulaire impossible à charger, avec le message d'erreur s'il y en a un. */
  onUnavailable: (message: string | null) => void;
}) {
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    void openConnectSession().then((first) => {
      if (cancelled) return;
      if ("error" in first) {
        onUnavailable(first.error);
        return;
      }
      let initial: string | null = first.clientSecret;
      setInstance(
        loadConnectAndInitialize({
          publishableKey: first.publishableKey,
          // Premier secret déjà obtenu, puis une nouvelle session à chaque expiration.
          fetchClientSecret: async () => {
            if (initial) {
              const secret = initial;
              initial = null;
              return secret;
            }
            const next = await openConnectSession();
            if ("error" in next) throw new Error(next.error);
            return next.clientSecret;
          },
          locale: "fr-FR",
          appearance: {
            overlays: stripeConnectAppearance.overlays,
            variables: { ...stripeConnectAppearance.variables, fontFamily: FONT_FAMILY },
          },
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  if (!instance) return null;
  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <ConnectAccountOnboarding
        title={t.title}
        onExit={onExit}
        onLoadError={() => onUnavailable(null)}
        collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }}
      />
    </ConnectComponentsProvider>
  );
}
