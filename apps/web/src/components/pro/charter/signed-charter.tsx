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

const t = fr.pro.onboarding.charter;

/** Charte signée, en lecture seule : toutes les règles validées. */
export function SignedCharter({ backHref }: { backHref: string }) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref as Route}
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
