import { BadgeCheck, Clock, Search, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";
import { HERO_IMAGE } from "@/lib/site/images";
import { HomeNav } from "./home-nav";

const t = fr.home;
const SHORTCUTS = ["electricien", "plombier", "macon", "peintre", "terrassier"];
const TAG_ICONS = [BadgeCheck, ShieldCheck, Clock];

/**
 * Bandeau de l'accueil (maquette « Homepage ») : photo plein cadre arrondie, navigation en
 * verre dépoli, titre, recherche, raccourcis métiers, encart « artisans vérifiés ».
 * Aucun chiffre ni témoignage inventé (spec F-01) : le nombre d'artisans vient de la base.
 */
export function HomeHero({ verifiedArtisans }: { verifiedArtisans: number }) {
  return (
    <section className="px-2 pt-2 sm:px-4 sm:pt-4">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[#0f1b4d]">
        {HERO_IMAGE ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
            <img src={HERO_IMAGE} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1230]/85 via-[#0b1230]/45 to-transparent" />
          </>
        ) : (
          <HeroBackdrop />
        )}

        <div className="relative flex min-h-[620px] flex-col p-3 sm:p-6 lg:min-h-[680px]">
          <HomeNav />

          {/* Pastilles flottantes : engagements réels de MENAO (pas de faux témoignages). */}
          <ul aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
            {t.heroTags.map((tag, i) => {
              const Icon = TAG_ICONS[i] ?? BadgeCheck;
              const position = [
                "top-[34%] right-[30%]",
                "top-[48%] right-[8%]",
                "top-[60%] right-[24%]",
              ][i];
              return (
                <li
                  key={tag}
                  className={`absolute ${position} flex items-center gap-2 rounded-2xl border border-white/40 bg-white/20 px-3.5 py-2 text-sm font-medium text-white shadow-raised backdrop-blur-md`}
                >
                  <Icon className="size-4" />
                  {tag}
                </li>
              );
            })}
          </ul>

          <div className="relative mt-auto flex flex-col gap-6 px-2 pt-16 pb-4 sm:px-4 lg:max-w-[40rem]">
            <h1 className="text-[2.375rem] leading-[1.05] font-medium tracking-tight text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              {t.heroTitleStart} <span className="text-[#aebcff]">{t.heroTitleAccent}</span>
            </h1>
            <div className="text-[0.9375rem] text-white/90 sm:text-base">
              <p className="font-medium text-white">{t.heroFree}</p>
              <p>{t.heroSubtitle}</p>
            </div>
            <form
              action="/recherche"
              method="get"
              role="search"
              className="flex w-full max-w-xl items-center gap-2 rounded-pill bg-white p-1.5 pl-5 shadow-raised focus-within:ring-4 focus-within:ring-white/40"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t.searchLabel}
              </label>
              <input
                id="hero-q"
                name="q"
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-subtle-foreground focus:outline-none"
              />
              <button
                type="submit"
                aria-label={t.searchSubmit}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                <Search aria-hidden="true" className="size-5" />
              </button>
            </form>
            <ul aria-label={t.shortcuts} className="flex flex-wrap gap-2">
              {SHORTCUTS.map((code) => {
                const domain = fr.tradeDomains[code];
                return (
                  <li key={code}>
                    <Link
                      href={`/recherche?metier=${code}` as Route}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-pill bg-white/90 px-3 text-xs font-medium text-foreground hover:bg-white"
                    >
                      <span aria-hidden="true">{domain?.emoji}</span>
                      {domain?.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/recherche"
                  aria-label={t.moreTrades}
                  className="inline-flex min-h-8 items-center rounded-pill bg-white/90 px-3 text-xs font-medium text-foreground hover:bg-white"
                >
                  …
                </Link>
              </li>
            </ul>
          </div>

          <div className="absolute right-6 bottom-6 hidden items-center gap-3 rounded-2xl border border-white/40 bg-white/15 py-2.5 pr-5 pl-2.5 text-white shadow-raised backdrop-blur-md lg:flex">
            <span className="flex -space-x-2">
              {[BadgeCheck, ShieldCheck, Clock].map((Icon, i) => (
                <span
                  key={i}
                  className="inline-flex size-9 items-center justify-center rounded-full border-2 border-white/70 bg-primary"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              ))}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium">
                {verifiedArtisans > 0
                  ? t.verifiedBadgeCount(verifiedArtisans)
                  : t.verifiedBadgeTitle}
              </span>
              <span className="text-xs text-white/80">{t.verifiedBadgeText}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Visuel de remplacement du bandeau, en attendant la photo des maquettes. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_40%,#3f5ff0_72%,#8ea4fb_100%)]" />
      <div className="absolute -top-40 -right-24 size-[44rem] rounded-full bg-[#9fb2ff]/40 blur-3xl" />
      <div className="absolute -bottom-48 left-1/3 size-[36rem] rounded-full bg-[#4869f6]/50 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" />
      <LogoMark
        tone="white"
        className="absolute top-1/2 right-[6%] hidden size-[26rem] -translate-y-1/3 opacity-[0.08] lg:block"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1230]/70 via-[#0b1230]/20 to-transparent" />
    </div>
  );
}
