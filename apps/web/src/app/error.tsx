"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorIllustration } from "@/components/site/illustrations";
import { Button, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.errorPage;

/**
 * Erreur inattendue (limite d'erreur de l'application) : page MENAO en français, « Réessayer » et
 * retour à l'accueil. L'erreur est transmise à Sentry (sans données personnelles, règle 11).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <ErrorIllustration className="w-60 sm:w-72" />
      <h1 className="max-w-xl text-2xl font-medium tracking-tight sm:text-[2rem]">{t.title}</h1>
      <p className="max-w-lg text-muted-foreground">{t.text}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" block={false} onClick={reset}>
          {t.retry}
        </Button>
        <ButtonLink href="/" size="lg" variant="outline">
          {t.home}
        </ButtonLink>
      </div>
    </main>
  );
}
