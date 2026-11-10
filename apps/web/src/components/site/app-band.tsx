import { fr } from "@/i18n/fr";
import { ScenePhoto } from "./scene-photo";
import { StoreBadges } from "./store-badges";

const t = fr.appDownload;

/**
 * L'application, sous les étapes de « Comment ça marche » (ADR 0264) : bandeau bleu nuit avec le
 * titre de la fenêtre « Suivez tous vos chantiers, depuis votre poche », les badges des stores et
 * la photo d'une particulière qui suit son chantier (ADR 0271).
 */
export function AppBand({ id }: { id: string }) {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-[1.5rem] bg-foreground p-6 text-white sm:p-8 lg:min-h-[19rem] lg:justify-center lg:py-10 lg:pr-[46%] lg:pl-12">
      <div className="-mx-6 -mt-6 h-52 [mask-image:linear-gradient(180deg,#000_55%,transparent)] sm:-mx-8 sm:-mt-8 sm:h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:h-auto lg:w-[44%] lg:[mask-image:linear-gradient(90deg,transparent,#000_32%)]">
        <ScenePhoto
          scene="camilleFollow"
          sizes="(min-width: 1024px) 500px, 100vw"
          position="45% 40%"
          className="size-full"
        />
      </div>
      <div className="relative flex flex-col gap-2">
        <h3
          id={id}
          className="font-display text-xl font-bold tracking-tight sm:text-2xl lg:text-[1.75rem]"
        >
          {t.title}
        </h3>
        <p className="text-sm text-pretty text-white/75 sm:text-[0.9375rem]">
          {t.features.join(" · ")}
        </p>
      </div>
      <StoreBadges className="relative shrink-0" />
    </div>
  );
}
