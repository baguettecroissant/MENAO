import { ArrowRight, CircleCheck } from "lucide-react";
import { HeroPreview } from "@/components/pro-landing/hero-preview";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.site.proTeaser;

/** Encart « Vous êtes artisan ? » vers l'Espace Pro, avec l'aperçu de l'application. */
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function ProTeaser({
  id,
  price,
}: {
  id: string;
  /** Formule d'entrée, lue dans la table des formules (accueil, ADR 0264). */
  price?: { cents: number; plan: string } | null;
}) {
  return (
    <section aria-labelledby={id} className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 overflow-hidden rounded-hero bg-foreground px-6 py-12 text-white sm:px-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:py-14">
        <div className="reveal flex flex-col gap-5">
          <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-[#9fb1ef] uppercase">
            {t.eyebrow}
          </p>
          <h2
            id={id}
            className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[2.75rem]"
          >
            {t.title}
          </h2>
          <p className="text-pretty text-white/80">{t.text}</p>
          {price && (
            <p className="flex items-baseline gap-2.5">
              <span className="font-display text-[2.25rem] leading-none font-bold tracking-tight">
                {t.price(euros.format(price.cents / 100))}
              </span>
              <span className="text-[0.9375rem] text-white/75">{t.priceUnit(price.plan)}</span>
            </p>
          )}
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {t.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-white/90">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <ButtonLink href="/pro" variant="secondary" size="lg" className="self-start border-white">
            {t.action}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
        <div className="hidden min-w-0 sm:block">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
