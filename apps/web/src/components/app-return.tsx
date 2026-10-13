"use client";

import { appDeepLink, appReturnSitePath, parseAppReturn } from "@menao/core";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { TextLink, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.appReturn;

/**
 * Retour dans l'application (ADR 0060) : seuls des écrans et des états connus sont acceptés, avec
 * un identifiant au format UUID. Hors de l'application, la page équivalente du site reste proposée.
 */
export function AppReturnPanel() {
  const target = parseAppReturn(useSearchParams());
  const deepLink = target ? appDeepLink(target) : null;

  useEffect(() => {
    if (deepLink) window.location.replace(deepLink);
  }, [deepLink]);

  if (!target || !deepLink) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">{t.invalid}</p>
        <TextLink href="/mon-espace">{t.mySpace}</TextLink>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{t.states[target.state]}</p>
      <a href={deepLink} className={buttonClasses({ size: "lg" })}>
        {t.open}
      </a>
      <TextLink href={appReturnSitePath(target) as Route}>{t.site}</TextLink>
    </div>
  );
}
