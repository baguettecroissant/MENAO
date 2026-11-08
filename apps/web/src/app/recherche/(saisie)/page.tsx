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
const FEATURE_TONES = [
  "bg-primary-soft text-primary-strong",
  "bg-warning-soft text-warning",
  "bg-success-soft text-success",
  "bg-background text-label",
];

export const metadata: Metadata = {
  title: `${fr.nav.describeProject} — MENAO`,
  description: fr.meta.description,
  alternates: { canonical: "/recherche" },
};

// Page statique (métiers mis en cache) ; la saisie est pré-remplie côté navigateur.
export const revalidate = 3600;

/** Saisie du besoin (F-05), maquettes « Page de recherche – Saisie et dictée ». */
export default async function SearchPage() {
  const { trades } = await seoCatalog();
  // Refonte « Nette » (ADR 0257) : grand titre centré, saisie large, quatre cartes de confiance.
  return (
    <main>
      <section className="bg-background px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="inline-flex items-center gap-1.5 rounded-chip bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-strong">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {t.tagline}
            </p>
            <h1 className="max-w-3xl text-[2.125rem] leading-[1.04] sm:text-[3rem] lg:text-[3.5rem]">
              {t.titleStart} <span className="text-primary">{t.titleAccent}</span>
            </h1>
          </div>
          <div className="w-full max-w-3xl">
            <Suspense fallback={<NeedForm trades={trades} />}>
              <NeedFormFromQuery trades={trades} />
            </Suspense>
          </div>
          <ul className="mt-4 grid w-full gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
            {t.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Sparkles;
              const tone = FEATURE_TONES[i] ?? FEATURE_TONES[0];
              return (
                <li
                  key={feature.title}
                  className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card"
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-input ${tone}`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="font-bold">{feature.title}</p>
                  <p className="text-sm leading-relaxed text-label">{feature.body}</p>
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
