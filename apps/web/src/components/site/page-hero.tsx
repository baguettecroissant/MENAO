import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { frenchSpacing } from "@/lib/site/typography";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * Bandeau d'en-tête des pages du site (même forme que l'accueil et l'Espace Pro) : fil d'Ariane,
 * surtitre, titre avec sa partie accentuée, chapeau, actions et illustration facultative.
 * « brand » : dégradé MENAO (pages de présentation) ; « soft » : bleu très clair (pages légales).
 */
export function PageHero({
  id,
  eyebrow,
  title,
  accent,
  subtitle,
  breadcrumbs,
  actions,
  aside,
  children,
  tone = "brand",
}: {
  id: string;
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle?: string;
  breadcrumbs?: readonly Crumb[];
  actions?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  tone?: "brand" | "soft";
}) {
  const brand = tone === "brand";
  return (
    <section aria-labelledby={id} className="px-2 pt-2 sm:px-4 sm:pt-4">
      <div
        className={`relative mx-auto max-w-[1440px] overflow-hidden rounded-hero px-6 sm:px-12 ${
          brand
            ? "bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_45%,#4869f6_80%,#8ea4fb_100%)] py-12 text-white sm:py-16 lg:py-20"
            : "bg-[linear-gradient(120deg,#e4eafd_0%,#f1f4fe_55%,#f9f7f0_100%)] py-10 text-foreground sm:py-14"
        }`}
      >
        <LogoMark
          tone={brand ? "white" : "brand"}
          className={`absolute -right-16 -bottom-24 hidden size-[26rem] animate-menao-float [animation-duration:9s] lg:block ${brand ? "opacity-[0.07]" : "opacity-[0.06]"}`}
        />
        <div
          className={`relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 ${
            aside ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12" : ""
          }`}
        >
          <div className="flex animate-menao-rise flex-col gap-5">
            {breadcrumbs && (
              <Breadcrumbs items={breadcrumbs} tone={brand ? "inverse" : "default"} />
            )}
            <span
              className={`inline-flex self-start rounded-pill px-3 py-1 text-sm ${
                brand
                  ? "border border-white/30 bg-white/15 backdrop-blur"
                  : "bg-surface text-primary-strong shadow-card"
              }`}
            >
              {eyebrow}
            </span>
            <h1
              id={id}
              className={`max-w-3xl leading-[1.08] font-medium tracking-tight text-balance ${
                brand ? "text-[2.125rem] sm:text-[3rem]" : "text-[2rem] sm:text-[2.5rem]"
              }`}
            >
              {frenchSpacing(title)}
              {accent && (
                <>
                  {" "}
                  <span className={brand ? "text-[#b9c7fc]" : "text-primary"}>
                    {frenchSpacing(accent)}
                  </span>
                </>
              )}
            </h1>
            {subtitle && (
              <p
                className={`max-w-2xl text-lg text-pretty ${brand ? "text-white/85" : "text-muted-foreground"}`}
              >
                {frenchSpacing(subtitle)}
              </p>
            )}
            {actions && (
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
                {actions}
              </div>
            )}
            {children}
          </div>
          {aside && (
            <div className="min-w-0 animate-menao-rise [animation-delay:200ms]">
              <div className="animate-menao-float [animation-duration:7s]">{aside}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
