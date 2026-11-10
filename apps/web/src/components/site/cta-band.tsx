import type { Route } from "next";
import { ArrowRight, CircleCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui";
import { frenchSpacing } from "@/lib/site/typography";
import { ScenePhoto, type SceneKey } from "./scene-photo";

/** Appel à l'action de fin de page, identique sur tout le site (dégradé MENAO, réassurance). */
export function CtaBand({
  id,
  title,
  text,
  action,
  secondary,
  reassurance,
  photo,
}: {
  id: string;
  title: string;
  text: string;
  action: { href: string; label: string };
  secondary?: { href: string; label: string };
  reassurance?: readonly string[];
  /** Photo à droite, texte aligné à gauche (au-dessus du texte sur mobile), ADR 0271. */
  photo?: { scene: SceneKey; position?: string };
}) {
  return (
    <section aria-labelledby={id} className="px-2 pb-2 sm:px-4 sm:pb-4">
      {/* Refonte « Nette » (ADR 0261) : carte bleu clair, texte bleu nuit, bouton principal bleu. */}
      <div
        className={`relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-primary-soft px-6 py-16 text-center text-foreground sm:px-12 sm:py-20 ${photo ? "lg:py-28 lg:pr-[46%] lg:pl-24 lg:text-left" : ""}`}
      >
        <LogoMark className="absolute -top-20 -left-16 hidden size-[22rem] animate-menao-float opacity-[0.06] [animation-duration:9s] md:block" />
        {photo && (
          <div className="-mx-6 -mt-16 mb-8 h-64 [mask-image:linear-gradient(180deg,#000_55%,transparent)] sm:-mx-12 sm:-mt-20 sm:h-72 lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:h-auto lg:w-[45%] lg:[mask-image:linear-gradient(90deg,transparent,#000_30%)]">
            <ScenePhoto
              scene={photo.scene}
              sizes="(min-width: 1024px) 650px, 100vw"
              position={photo.position}
              className="size-full"
            />
          </div>
        )}
        <div
          className={`reveal relative mx-auto flex max-w-2xl flex-col items-center gap-5 ${photo ? "lg:mx-0 lg:items-start" : ""}`}
        >
          <h2
            id={id}
            className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[3rem]"
          >
            {frenchSpacing(title)}
          </h2>
          <p className="text-pretty text-label sm:text-lg">{frenchSpacing(text)}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <ButtonLink href={action.href as Route} size="lg">
              {action.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            {secondary && (
              <ButtonLink href={secondary.href as Route} variant="secondary" size="lg">
                {secondary.label}
              </ButtonLink>
            )}
          </div>
          {reassurance && (
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-label">
              {reassurance.map((item) => (
                <li key={item} className="flex items-center gap-1.5 whitespace-nowrap">
                  <CircleCheck aria-hidden="true" className="size-4 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
