import type { PlanComparison } from "@menao/core";
import { Check, Minus } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Comparatif détaillé des formules (F-15, ADR 0200), contenu lu en base (`plan_features`) : une
 * ligne par fonctionnalité, rangées par catégorie. Largeurs fixes, sans défilement de côté sur
 * téléphone ; l'en-tête des formules reste visible sous l'en-tête du site.
 */
export function PlanComparisonTable({
  plans,
  comparison,
}: {
  plans: {
    code: string;
    nom: string;
    monthlyCents: number;
    ouverte: boolean;
    recommandee: boolean;
  }[];
  comparison: PlanComparison;
}) {
  return (
    <section aria-labelledby="comparatif-formules" className="flex flex-col gap-6">
      <h3
        id="comparatif-formules"
        className="text-center text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2rem]"
      >
        {t.compare.title}
      </h3>
      <table className="w-full table-fixed border-separate border-spacing-0 text-xs sm:text-sm">
        <caption className="sr-only">{t.compare.caption}</caption>
        <colgroup>
          <col className="w-[40%] sm:w-[46%]" />
          {plans.map((plan) => (
            <col key={plan.code} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-16 z-10 border-b border-border bg-surface py-3 text-left"
            >
              <span className="sr-only">{t.compare.feature}</span>
            </th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                scope="col"
                className="sticky top-16 z-10 border-b border-border bg-surface px-1 py-3 text-center align-top font-normal"
              >
                {plan.recommandee && (
                  <span className="mx-auto mb-1 block w-fit rounded-pill bg-primary px-2 py-0.5 text-[0.625rem] font-medium tracking-wide text-primary-foreground uppercase sm:text-[0.6875rem]">
                    {t.recommended}
                  </span>
                )}
                <span className="block font-medium text-foreground sm:text-base">{plan.nom}</span>
                <span className="block text-muted-foreground">
                  {euros.format(plan.monthlyCents / 100)}
                  <span className="hidden sm:inline"> {t.perMonth}</span>
                </span>
                {!plan.ouverte && (
                  <span className="mt-1 block text-[0.6875rem] text-subtle-foreground">
                    {t.soon}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        {comparison.map((group) => (
          <tbody key={group.categorie}>
            <tr>
              <th
                scope="colgroup"
                colSpan={plans.length + 1}
                className="bg-background px-3 py-2.5 text-left font-medium text-foreground sm:px-4"
              >
                {group.categorie}
              </th>
            </tr>
            {group.items.map((item) => (
              <tr key={item.libelle}>
                <th
                  scope="row"
                  className="border-b border-border py-3 pr-2 pl-3 text-left align-top font-normal sm:pl-4"
                >
                  <span className="block text-foreground">{item.libelle}</span>
                  {item.detail && (
                    <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground sm:text-xs">
                      {item.detail}
                    </span>
                  )}
                </th>
                {item.cells.map((cell, i) => (
                  <td
                    key={plans[i]?.code ?? i}
                    className="border-b border-border px-1 py-3 text-center align-top"
                  >
                    {cell.kind === "inclus" ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                        <span className="sr-only">{t.compare.included}</span>
                      </span>
                    ) : cell.kind === "absent" ? (
                      <span className="inline-flex size-5 items-center justify-center text-subtle-foreground">
                        <Minus aria-hidden="true" className="size-4" />
                        <span className="sr-only">{t.compare.notIncluded}</span>
                      </span>
                    ) : (
                      <span className="text-foreground">{cell.text}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  );
}
