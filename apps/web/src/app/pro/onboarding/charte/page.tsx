import { CHARTER_SECTIONS } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import {
  CharterHero,
  CheerSection,
  PromisesSection,
  RuleContent,
  SectionExtras,
  SectionHeader,
} from "@/components/pro/charter/charter-parts";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { CharterDone } from "./charter-done";
import { CharterForm } from "./charter-form";

const t = fr.pro.onboarding.charter;

/**
 * Étape « Charte qualité » de l'inscription pro (ADR 0104) : lecture et signature, puis écran de
 * bienvenue avec le récapitulatif. « Relire la charte » affiche la version signée.
 */
export default async function CharterPage({
  searchParams,
}: {
  searchParams: Promise<{ relire?: string }>;
}) {
  const { supabase, userId, artisan, charter } = await getOnboardingContext();
  const { relire } = await searchParams;

  if (!charter) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    return (
      <CharterForm
        defaults={{
          name,
          company: artisan.nom_commercial ?? artisan.raison_sociale ?? "",
          siret: artisan.siret ?? "",
        }}
      />
    );
  }

  if (relire) return <SignedCharter />;

  return <CharterDone charter={charter} />;
}

/** Charte signée, en lecture seule : toutes les règles validées. */
function SignedCharter() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/pro/onboarding/charte" as Route}
        className="self-start text-sm font-bold text-primary-strong hover:underline"
      >
        ← {t.back}
      </Link>
      <CharterHero />
      {CHARTER_SECTIONS.map((section, si) => (
        <section
          key={section.id}
          aria-labelledby={`h-${section.id}`}
          className="rounded-card border border-border bg-surface p-5"
        >
          <SectionHeader
            section={section}
            index={si}
            state={
              <span className="rounded-pill bg-success-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-success">
                {t.validated}
              </span>
            }
          />
          <SectionExtras section={section} />
          <ul className="mt-3.5 flex flex-col gap-2">
            {section.rules.map((rule, ri) => (
              <li
                key={rule.title}
                className="flex items-start gap-3 rounded-input border-[1.5px] border-primary bg-[#f7f8ff] p-3"
              >
                <RuleContent code={`R${si + 1}.${ri + 1}`} {...rule} checked />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <PromisesSection index={CHARTER_SECTIONS.length + 1} />
      <CheerSection />
    </div>
  );
}
