import { fr } from "@/i18n/fr";
import { StoreBadges } from "./store-badges";

const t = fr.appDownload;

/**
 * L'application, sous les étapes de « Comment ça marche » (ADR 0264) : bandeau bleu nuit avec le
 * titre de la fenêtre « Suivez tous vos chantiers, depuis votre poche » et les badges des stores.
 */
export function AppBand({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-5 rounded-[1.5rem] bg-foreground p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex flex-col gap-2">
        <h3 id={id} className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {t.title}
        </h3>
        <p className="text-sm text-pretty text-white/75 sm:text-[0.9375rem]">
          {t.features.join(" · ")}
        </p>
      </div>
      <StoreBadges className="shrink-0" />
    </div>
  );
}
