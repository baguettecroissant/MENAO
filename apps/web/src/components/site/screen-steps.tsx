import { APP_SCREENS, type AppScreenKey } from "@/lib/site/app-screens";
import { fr } from "@/i18n/fr";
import { PhoneMockup } from "./device-mockups";

/**
 * Étapes illustrées par les vrais écrans de l'application (ADR 0147) : quatre colonnes sur grand
 * écran, carrousel horizontal sur mobile pour garder la page courte. Le téléphone sort du bas de
 * son encart.
 */
export function ScreenSteps({
  items,
  screens,
}: {
  items: readonly { title: string; text: string }[];
  screens: readonly AppScreenKey[];
}) {
  return (
    <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
      {items.map((step, i) => {
        const key = screens[i];
        return (
          <li
            key={step.title}
            className="flex w-[78%] shrink-0 snap-center flex-col gap-5 sm:w-[46%] md:w-auto"
          >
            <div className="relative h-72 overflow-hidden rounded-card bg-[linear-gradient(180deg,var(--color-primary-soft)_0%,var(--color-primary-softer)_100%)] px-8 pt-7">
              {key && (
                <PhoneMockup
                  screen={APP_SCREENS[key]}
                  alt={fr.site.mockups.screens[key]}
                  className="mx-auto w-full max-w-[13rem]"
                />
              )}
            </div>
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[1.0625rem] font-medium text-balance">{step.title}</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
