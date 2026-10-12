import { BadgePercent, Clock, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NeedForm } from "@/components/project/need-form";
import { NeedFormFromQuery } from "@/components/project/need-form-from-query";
import { TrustSection } from "@/components/site/trust-section";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";

const t = fr.search;
const FEATURE_ICONS = [Sparkles, Clock, ShieldCheck, BadgePercent];

export const metadata: Metadata = {
  title: `${fr.nav.findArtisanBtp} — MENAO`,
  description: fr.meta.description,
  alternates: { canonical: "/recherche" },
};

// Page statique (métiers mis en cache) ; la saisie est pré-remplie côté navigateur.
export const revalidate = 3600;

/** Saisie du besoin (F-05), maquettes « Page de recherche – Saisie et dictée ». */
export default async function SearchPage() {
  const { trades } = await seoCatalog();
  return (
    <main>
      <section className="bg-background px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-3 lg:-mx-24">
            <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2.25rem] lg:text-[2.5rem]">
              {t.titleStart} <span className="text-primary">{t.titleAccent}</span>
            </h1>
            <p className="inline-flex items-center gap-1.5 text-sm text-primary-strong">
              <Sparkles aria-hidden="true" className="size-4" />
              {t.tagline}
            </p>
          </div>
          <Suspense fallback={<NeedForm trades={trades} />}>
            <NeedFormFromQuery trades={trades} />
          </Suspense>
          <ul className="mt-6 grid w-full gap-3 text-left sm:grid-cols-2">
            {t.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Sparkles;
              return (
                <li
                  key={feature.title}
                  className="rounded-card border border-border bg-surface p-4 shadow-card"
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Icon aria-hidden="true" className="size-4 text-primary" />
                    {feature.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <TrustSection />
    </main>
  );
}
