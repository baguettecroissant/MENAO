"use client";

import { fontFamily, stripeConnectAppearance } from "@menao/ui-tokens";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js/pure";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { openConnectSession } from "@/lib/artisan/actions";
import { ConnectButton } from "../connect-button";

const t = fr.pro.onboarding.connect;

/** Retour à l'étape Paiements, qui relit l'état du compte chez Stripe (`?retour=1`). */
const RETURN_PATH = "/pro/onboarding/paiements?retour=1";

type CustomFont = {
  family: string;
  src: string;
  weight?: string;
  style?: "normal" | "italic" | "oblique";
  unicodeRange?: string;
};

const FONT_STYLES = new Set(["normal", "italic", "oblique"]);

/** Police de MENAO, avec le même repli que le site (jetons de design). */
const FONT_FAMILY = fontFamily.sans.replace("var(--font-inter)", '"Inter"');

/** Sous-ensembles latins (U+0-FF, latin étendu) : ceux du français. */
const LATIN = /^U\+(0-FF|100-)/i;

/**
 * Polices de la page (Inter, servie par next/font sous un nom de fichier haché), transmises
 * au formulaire Stripe, qui s'affiche dans un cadre et ne peut pas les lire lui-même. Stripe
 * n'accepte que des fichiers en HTTPS : en local, le formulaire garde la police de repli.
 */
function pageFonts(family: string): CustomFont[] {
  const fonts: CustomFont[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const name = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      const url = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
      const unicodeRange = rule.style.getPropertyValue("unicode-range");
      // next/font peut préfixer le nom (« __Inter_… ») : on accepte les deux, sans le repli.
      const matches =
        name === family || (name.startsWith(`__${family}_`) && !name.includes("Fallback"));
      if (!matches || !url || !LATIN.test(unicodeRange)) continue;
      // Adresse relative à la feuille de style, pas à la page.
      const href = new URL(url, sheet.href ?? window.location.href).href;
      if (!href.startsWith("https:")) continue;
      fonts.push({
        family,
        src: `url(${href})`,
        weight: rule.style.getPropertyValue("font-weight") || undefined,
        style: FONT_STYLES.has(rule.style.getPropertyValue("font-style"))
          ? (rule.style.getPropertyValue("font-style") as CustomFont["style"])
          : undefined,
        unicodeRange,
      });
    }
  }
  return fonts;
}

/**
 * Formulaire d'inscription Stripe affiché dans MENAO (composant Connect « account onboarding »,
 * ADR 0215), aux couleurs de MENAO. Il demande tout ce que Stripe exigera, même plus tard, pour
 * éviter un blocage des virements en cours de chantier. La connexion à Stripe s'ouvre dans une
 * fenêtre (imposée par Stripe). En secours, le lien vers le site de Stripe.
 */
export function ConnectEmbedded({
  loadSession = openConnectSession,
}: {
  /** Session Stripe du compte de l'artisan connecté (action serveur par défaut). */
  loadSession?: typeof openConnectSession;
}) {
  const router = useRouter();
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSession().then((first) => {
      if (cancelled) return;
      if ("error" in first) {
        setError(first.error);
        setFailed(true);
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
            const next = await loadSession();
            if ("error" in next) throw new Error(next.error);
            return next.clientSecret;
          },
          locale: "fr-FR",
          fonts: pageFonts("Inter"),
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
  }, [loadSession]);

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {instance && !failed && (
        <ConnectComponentsProvider connectInstance={instance}>
          <ConnectAccountOnboarding
            onExit={() => router.push(RETURN_PATH)}
            onLoadError={() => setFailed(true)}
            collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }}
          />
        </ConnectComponentsProvider>
      )}
      {!instance && !failed && (
        <p role="status" className="text-sm text-muted-foreground">
          {t.embedded.loading}
        </p>
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">{t.embedded.fallback}</p>
        <ConnectButton label={t.embedded.openStripe} variant={failed ? "primary" : "outline"} />
      </div>
    </div>
  );
}
