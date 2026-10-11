import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { TRADE_IMAGES } from "@/lib/site/images";
import { frenchSpacing } from "@/lib/site/typography";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { DEFAULT_TRADE_VISUAL, TRADE_VISUALS } from "./trade-visuals";

/**
 * Bandeau des pages métier et métier × ville (F-02) : dégradé MENAO, photo du métier en colonne
 * (bandeau en mobile), fondue dans le dégradé, jamais sous le texte.
 */
export function TradeHero({
  id,
  code,
  eyebrow,
  title,
  intro,
  breadcrumbs,
  cta,
  hint,
}: {
  id: string;
  code: string;
  eyebrow: string;
  title: string;
  intro: string;
  breadcrumbs: readonly Crumb[];
  cta: { href: string; label: string };
  hint?: string;
}) {
  const image = TRADE_IMAGES[code];
  const Icon = (TRADE_VISUALS[code] ?? DEFAULT_TRADE_VISUAL).icon;
  return (
    <section aria-labelledby={id} className="px-2 pt-2 sm:px-4 sm:pt-4">
      <div
        className={`relative mx-auto grid max-w-[1440px] grid-cols-1 overflow-hidden rounded-hero bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_45%,#4869f6_100%)] ${
          image ? "md:grid-cols-[minmax(0,1fr)_minmax(0,42%)]" : ""
        }`}
      >
        {image ? (
          <div className="relative h-56 md:order-2 md:h-auto md:min-h-[26rem]">
            {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
            <img
              src={image}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[center_22%] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
            />
          </div>
        ) : (
          <Icon
            aria-hidden="true"
            strokeWidth={1.1}
            className="absolute -right-8 -bottom-10 size-72 text-white/10"
          />
        )}
        <div className="relative flex flex-col justify-center gap-5 px-6 pt-4 pb-10 text-white sm:px-12 sm:pb-14 md:order-1 md:py-16 lg:py-20 lg:pl-[calc(3rem+max(0px,(min(100vw-2rem,88rem)-78rem)/2))]">
          <Breadcrumbs items={breadcrumbs} tone="inverse" />
          <span className="inline-flex self-start rounded-pill border border-white/30 bg-white/15 px-3 py-1 text-sm backdrop-blur">
            {eyebrow}
          </span>
          <h1
            id={id}
            className="text-[2.125rem] leading-[1.08] font-medium tracking-tight text-balance sm:text-[3rem]"
          >
            {frenchSpacing(title)}
          </h1>
          <p className="max-w-xl text-pretty text-white/85">{intro}</p>
          <div className="flex flex-col items-start gap-2 pt-1">
            <ButtonLink
              href={cta.href as Route}
              variant="secondary"
              size="lg"
              className="border-white"
            >
              {cta.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            {hint && <p className="text-xs text-white/80">{hint}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
