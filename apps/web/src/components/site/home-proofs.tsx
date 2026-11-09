import { ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { CountUp } from "./count-up";

const t = fr.trust;
// Chaque preuve mène à son explication (ADR 0264, rapport « Site vitrine wahou et SEO », AC3).
const STAT_LINKS = [
  "/garanties#guarantees-checks",
  "/garanties#guarantees-payment",
  "/comment-ca-marche",
] as const;

/**
 * Preuves de l'accueil (ADR 0264) : titre à gauche, les trois engagements dans un cadre à droite,
 * chacun cliquable vers sa page d'explication. Aucun chiffre inventé (spec F-01).
 * TODO(legal) : faire valider les formulations « 100 % », « 0 % » et « 72 h ».
 */
export function HomeProofs() {
  return (
    <section aria-labelledby="confiance" className="bg-surface pt-14 pb-6 sm:pt-20 sm:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12">
        <div className="reveal flex flex-col gap-3 lg:w-[23rem] lg:shrink-0">
          <h2
            id="confiance"
            className="text-[1.75rem] leading-[1.08] font-bold tracking-tight text-balance sm:text-[2.5rem]"
          >
            {t.title}
          </h2>
          <p className="text-pretty text-label sm:text-[1.0625rem]">{t.subtitle}</p>
        </div>
        <ul className="grid flex-1 grid-cols-3 divide-x divide-border overflow-hidden rounded-[1.375rem] border border-border bg-background">
          {t.stats.map((stat, i) => (
            <li key={stat.label} className="flex">
              <Link
                href={STAT_LINKS[i] as Route}
                aria-label={fr.home.proofsMore(`${stat.value} ${stat.label}`)}
                className="group flex flex-1 flex-col gap-1.5 p-3.5 transition-colors hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-inset sm:p-7"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display text-[1.75rem] leading-none font-bold tracking-tight sm:text-[3.25rem]">
                    <CountUp value={stat.value} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-transform group-hover:-translate-y-0.5 sm:flex"
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </span>
                <span className="text-xs font-semibold text-balance text-label sm:text-[0.9375rem]">
                  {stat.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
