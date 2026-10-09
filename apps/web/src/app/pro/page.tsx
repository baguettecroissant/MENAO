import { ClipboardList, Mic, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: `${fr.nav.pro} — MENAO`,
  description: fr.pro.landing.subtitle,
  alternates: { canonical: "/pro" },
};

// Formules lues en base (table plans, F-15), page régénérée toutes les heures.
export const revalidate = 3600;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const t = fr.pro.landing;
const POINT_ICONS = [ClipboardList, Mic, Wallet];

/** Espace Pro (F-03) : page de présentation aux artisans et formules (table plans). */
export default async function ProLandingPage() {
  const { data: plans } = await createPublicClient()
    .from("plans")
    .select("code, nom, prix_mensuel_ht_centimes, ouverte")
    .order("ordre");
  return (
    <main className="bg-background">
      <section className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_45%,#4869f6_80%,#8ea4fb_100%)] px-6 py-16 text-white sm:px-12 sm:py-24">
          <LogoMark
            tone="white"
            className="absolute top-1/2 right-[4%] hidden size-[22rem] -translate-y-1/2 opacity-10 lg:block"
          />
          <div className="relative flex max-w-2xl flex-col gap-5">
            <span className="inline-flex self-start rounded-pill border border-white/30 bg-white/15 px-3 py-1 text-sm backdrop-blur">
              {fr.nav.pro}
            </span>
            <h1 className="text-[2.25rem] leading-[1.08] font-medium tracking-tight sm:text-[3.25rem]">
              {t.title}
            </h1>
            <p className="text-lg text-white/85">{t.subtitle}</p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <ButtonLink
                href="/pro/inscription"
                variant="secondary"
                size="lg"
                className="border-white"
              >
                {t.signUp}
              </ButtonLink>
              <ButtonLink
                href="/connexion"
                variant="ghost"
                size="lg"
                className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
              >
                {t.signIn}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-14 sm:px-6 sm:py-20">
        <ul className="grid gap-4 sm:grid-cols-3">
          {t.points.map((point, i) => {
            const Icon = POINT_ICONS[i] ?? ClipboardList;
            return (
              <li
                key={point}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <p className="font-medium">{point}</p>
              </li>
            );
          })}
        </ul>

        {plans && plans.length > 0 && (
          <section aria-label={t.plansTitle} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
                {t.plansTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{t.noCommission}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <li
                  key={plan.code}
                  className={`flex flex-col gap-4 rounded-card border bg-surface p-6 shadow-card ${
                    plan.ouverte ? "border-primary ring-4 ring-primary/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-medium">{plan.nom}</h3>
                    {plan.ouverte ? (
                      <StatusBadge>{t.open}</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">{t.soon}</StatusBadge>
                    )}
                  </div>
                  <p>
                    <span className="text-[2.25rem] leading-none font-medium tracking-tight">
                      {euros.format(plan.prix_mensuel_ht_centimes / 100)}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">{t.perMonth}</span>
                  </p>
                  {plan.ouverte && <p className="text-sm font-medium text-success">{t.trial}</p>}
                </li>
              ))}
            </ul>
            <div className="flex justify-center">
              <ButtonLink href="/pro/inscription" size="lg">
                {t.signUp}
              </ButtonLink>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
