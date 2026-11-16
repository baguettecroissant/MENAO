"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiWorking } from "@/components/ai-working";
import { fr } from "@/i18n/fr";
import { retryRegistry } from "@/lib/artisan/actions";

const t = fr.pro.onboarding.documents.registry;
const KEY = "menao:registre-relance";
/** Une relance au plus par quart d'heure et par navigateur : l'annuaire de l'État est fragile. */
const PAUSE_MS = 15 * 60 * 1000;

/**
 * Contrôle au registre jamais abouti (ADR 0354) : MENAO le relance tout seul à l'ouverture de
 * l'écran, au lieu de demander le Kbis sans explication. `silent` : sans rien afficher (« Mon
 * dossier », où la ligne du Kbis dit déjà ce qui se passe).
 */
export function RegistryAutoCheck({ silent = false }: { silent?: boolean }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let recent = false;
    try {
      recent = Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < PAUSE_MS;
      if (!recent) sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Stockage indisponible (navigation privée) : on relance quand même.
    }
    const job = recent ? Promise.resolve() : retryRegistry().catch(() => undefined);
    void job.then(() => {
      setChecking(false);
      if (!recent) router.refresh();
    });
  }, [router]);

  if (silent) return null;
  return checking ? (
    <div className="flex flex-col gap-2">
      <AiWorking label={t.checking} />
      <p className="text-sm text-muted-foreground">{t.checkingHint}</p>
    </div>
  ) : (
    <p role="status" className="rounded-input bg-primary-softer px-3.5 py-3 text-sm text-label">
      {t.noAnswer}
    </p>
  );
}
