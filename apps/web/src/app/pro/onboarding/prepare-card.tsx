import { PREPARE_ITEMS, type PrepareItemKey } from "@menao/core";
import { ChevronRight, Clock, FileText, Hash, IdCard, Landmark, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.help.prepare;

const icons: Record<PrepareItemKey, ReactNode> = {
  siret: <Hash aria-hidden="true" className="size-5" />,
  decennale: <ShieldCheck aria-hidden="true" className="size-5" />,
  rc_pro: <ShieldCheck aria-hidden="true" className="size-5" />,
  urssaf: <FileText aria-hidden="true" className="size-5" />,
  identite: <IdCard aria-hidden="true" className="size-5" />,
  rib: <Landmark aria-hidden="true" className="size-5" />,
};

// Où mène « Où le trouver » : la pièce et son aide, ou l'étape entreprise pour le SIRET.
// Le RIB sert à l'étape des paiements, ouverte après l'envoi du dossier : pas de lien.
const hrefs: Partial<Record<PrepareItemKey, Route>> = {
  siret: "/pro/onboarding/entreprise",
  decennale: "/pro/onboarding/documents?type=decennale" as Route,
  rc_pro: "/pro/onboarding/documents?type=rc_pro" as Route,
  urssaf: "/pro/onboarding/documents?type=urssaf" as Route,
  identite: "/pro/onboarding/documents?type=identite" as Route,
};

/**
 * « Avant de commencer » (lot 60, ADR 0347) : les six éléments à préparer, montrés tant qu'aucun
 * document n'a été déposé.
 */
export function PrepareCard() {
  return (
    <section
      aria-labelledby="avant-de-commencer"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="avant-de-commencer" className="text-[1.375rem]">
          {t.title}
        </h2>
        <p className="text-label">{t.intro}</p>
      </div>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {PREPARE_ITEMS.map((item) => {
          const href = hrefs[item.key];
          const content = (
            <>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-background text-label">
                {icons[item.key]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.hint}</span>
              </span>
              {href && (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
            </>
          );
          return (
            <li
              key={item.key}
              className="border-t border-border first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
            >
              {href ? (
                <Link
                  href={href}
                  aria-label={`${item.title} : ${t.help}`}
                  className={`flex items-center gap-3 rounded-input py-3 ${focusRing}`}
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="flex gap-2.5 rounded-input bg-primary-softer p-3 text-sm text-label">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
        {t.missing}
      </p>
    </section>
  );
}
