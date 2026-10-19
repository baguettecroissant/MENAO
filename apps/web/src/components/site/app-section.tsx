import { CalendarCheck, FileSignature, MessagesSquare } from "lucide-react";
import { fr } from "@/i18n/fr";
import { APP_SCREENS } from "@/lib/site/app-screens";
import { PhoneMockup } from "./device-mockups";
import { StoreBadges } from "./store-badges";

const t = fr.appDownload;
const m = fr.site.mockups;

/**
 * Section de l'application sur l'accueil (ADR 0150) : trois vrais écrans en éventail, les textes
 * de la fenêtre « Suivez tous vos chantiers, depuis votre poche » (maquette) et les badges des
 * stores. Les téléphones sortent du bas de la section : seul le haut des écrans compte.
 */
export function AppSection({ id }: { id: string }) {
  const features = [
    { icon: MessagesSquare, text: t.features[0] },
    { icon: FileSignature, text: t.features[1] },
    { icon: CalendarCheck, text: t.features[2] },
  ];
  return (
    <section aria-labelledby={id} className="overflow-hidden bg-primary-softer pt-16 sm:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-6 lg:pb-20">
          <h2
            id={id}
            className="text-[2rem] leading-[1.1] font-medium tracking-tight text-balance sm:text-[2.5rem]"
          >
            {t.title}
          </h2>
          <ul className="flex flex-col gap-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[1.0625rem]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <StoreBadges className="pt-2" />
        </div>
        {/* Éventail : l'accueil au centre, le devis et le suivi de chantier de part et d'autre. */}
        <div className="relative mx-auto h-[22rem] w-full max-w-md sm:h-[28rem] lg:h-[32rem] lg:max-w-none">
          <div className="absolute top-12 left-[2%] w-[38%] origin-bottom-right -rotate-[8deg] sm:top-16">
            <PhoneMockup screen={APP_SCREENS.clientDevis} alt={m.screens.clientDevis} />
          </div>
          <div className="absolute top-12 right-[2%] w-[38%] origin-bottom-left rotate-[8deg] sm:top-16">
            <PhoneMockup screen={APP_SCREENS.clientSuivi} alt={m.screens.clientSuivi} />
          </div>
          <div className="absolute top-0 left-1/2 w-[44%] -translate-x-1/2">
            <PhoneMockup screen={APP_SCREENS.clientAccueil} alt={m.screens.clientAccueil} />
          </div>
        </div>
      </div>
    </section>
  );
}
