import { ArrowRight, CircleCheck } from "lucide-react";
import { HeroPreview } from "@/components/pro-landing/hero-preview";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.site.proTeaser;

/** Encart « Vous êtes artisan ? » vers l'Espace Pro, avec l'aperçu de l'application. */
export function ProTeaser({ id }: { id: string }) {
  return (
    <section aria-labelledby={id} className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 overflow-hidden rounded-hero bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_55%,#4869f6_100%)] px-6 py-12 text-white sm:px-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:py-14">
        <div className="reveal flex flex-col gap-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
            {t.eyebrow}
          </p>
          <h2
            id={id}
            className="text-[1.75rem] leading-[1.15] font-medium tracking-tight text-balance sm:text-[2.25rem]"
          >
            {t.title}
          </h2>
          <p className="text-pretty text-white/80">{t.text}</p>
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
