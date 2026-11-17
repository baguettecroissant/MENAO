"use client";

import {
  ENGAGEMENT_GUARANTEE,
  TRIAL_DAYS,
  annualPriceCents,
  monthlyEquivalentCents,
  planAddedFeatures,
  splitPlanComparison,
  type PlanComparison,
  type PlanFeatureCell,
} from "@menao/core";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Euro,
  FileCheck,
  Inbox,
  LayoutGrid,
  Phone,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fr } from "@/i18n/fr";
import type { PlanFacts } from "@/lib/site/pro-plans";
import type { PricingPlan } from "./pricing-plans";

const t = fr.pro.landing;
const c = t.compare;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const price = (cents: number) => euros.format(cents / 100);
const number = new Intl.NumberFormat("fr-FR");
const TRIAL_MONTHS = Math.round(TRIAL_DAYS / 30);
const SIGN_UP = "/pro/inscription";
const NAVY = "text-[#0b1438]";
const BAND = "bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)]";

/** Icône de chaque rubrique du comparatif (ADR 0368) ; une rubrique nouvelle prend la grille. */
const GROUP_ICONS: Record<string, LucideIcon> = {
  "Demandes de chantier": Inbox,
  "Manon, votre secrétaire": Phone,
  "Devis et plans": FileCheck,
  "Votre argent": Euro,
  "Chantiers, équipe et visibilité": Users,
};
const groupIcon = (categorie: string) => GROUP_ICONS[categorie] ?? LayoutGrid;

type Plan = Pick<
  PricingPlan,
  "code" | "nom" | "accroche" | "monthlyCents" | "ouverte" | "recommandee"
>;

/**
 * Comparatif des formules (F-15, ADR 0200 ; repensé par l'ADR 0368, maquette lot 70) : la formule
 * recommandée en avant (bandeau « tout Base, plus N fonctions », colonne surlignée, seul bouton
 * plein), seulement ce qui change par défaut et les fonctions communes en pastilles. Sur
 * téléphone, des onglets par formule, la recommandée choisie d'office. Contenu lu en base
 * (`plan_features`), chiffres du bandeau lus dans `plans.limites`.
 */
export function PlanComparisonTable({
  plans,
  comparison,
  facts,
}: {
  plans: Plan[];
  comparison: PlanComparison;
  facts: PlanFacts;
}) {
  const split = splitPlanComparison(comparison);
  const recIndex = plans.findIndex((plan) => plan.recommandee);
  const rec = recIndex >= 0 ? plans[recIndex] : undefined;
  const base = plans[0];
  const added = rec && base && recIndex > 0 ? planAddedFeatures(comparison, 0, recIndex) : 0;
  const diffCount = split.total - split.common.length;

  return (
    <section aria-labelledby="comparatif-formules" className="flex flex-col gap-8 lg:gap-10">
      <div className="flex flex-col gap-3 lg:items-center lg:text-center">
        <p className="text-xs font-bold tracking-[0.08em] text-primary-strong uppercase lg:text-[0.8125rem]">
          {c.eyebrow}
        </p>
        <h2
          id="comparatif-formules"
          className="max-w-4xl text-[1.875rem] leading-[1.06] font-bold tracking-tight text-balance lg:text-[3rem] lg:leading-[1.04]"
        >
          {c.heading}
        </h2>
        <p className="hidden max-w-3xl text-pretty text-label lg:block lg:text-lg">{c.lead}</p>
      </div>

      {rec && base && added > 0 && (
        <Highlights plan={rec} base={base} added={added} facts={facts} />
      )}

      {/* Ordinateur : le tableau complet. */}
      <div className="hidden flex-col gap-6 lg:flex">
        <h3 className="text-[1.75rem] font-bold tracking-tight">{c.detailTitle}</h3>
        <DesktopTable
          plans={plans}
          recIndex={recIndex}
          groups={comparison}
          diffCount={diffCount}
          commonCount={split.common.length}
        />
      </div>

      {/* Téléphone : une formule à la fois. */}
      <MobileList
        plans={plans}
        recIndex={recIndex}
        groups={split.differences}
        common={split.common}
      />

      <p className="flex justify-center">
        <span className="inline-flex items-center gap-3 rounded-[1.25rem] border border-border bg-surface py-3 pr-5 pl-3 text-sm lg:rounded-pill">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
          <span>
            <b className="font-semibold">{c.guaranteeLabel}</b>{" "}
            <span className="text-label">
              {c.guarantee(
                ENGAGEMENT_GUARANTEE.minRequests,
                ENGAGEMENT_GUARANTEE.consecutiveMonths,
              )}
            </span>
          </span>
        </span>
      </p>
    </section>
  );
}

/** Bandeau de la formule recommandée : ce qu'elle ajoute, en six cartes (ADR 0368). */
function Highlights({
  plan,
  base,
  added,
  facts,
}: {
  plan: Plan;
  base: Plan;
  added: number;
  facts: PlanFacts;
}) {
  const h = c.highlights;
  const cards: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: Phone,
      title: h.secretary.title,
      text: h.secretary.text(number.format(facts.minutes ?? 0)),
    },
    ...(facts.requests && facts.baseRequests
      ? [
          {
            icon: Inbox,
            title: h.requests.title(facts.requests),
            text: h.requests.text(base.nom, facts.baseRequests),
          },
        ]
      : []),
    { icon: FileCheck, title: h.quote.title, text: h.quote.text },
    { icon: Euro, title: h.money.title, text: h.money.text },
    { icon: TrendingUp, title: h.margin.title, text: h.margin.text },
    ...(facts.accounts
      ? [{ icon: Users, title: h.team.title, text: h.team.text(facts.accounts) }]
      : []),
  ];
  return (
    <section
      aria-labelledby="comparatif-ajoute"
      className={`flex flex-col gap-4 overflow-hidden rounded-[1.375rem] ${BAND} py-5 pl-5 text-white lg:gap-7 lg:rounded-hero lg:px-11 lg:pt-10 lg:pb-11`}
    >
      <div className="flex flex-col gap-4 pr-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:pr-0">
        <div className="flex flex-col gap-1 lg:gap-2">
          <span className="hidden self-start rounded-pill bg-white/15 px-2.5 py-1 text-xs font-bold tracking-[0.08em] uppercase lg:inline">
            {c.recommendedBadge}
          </span>
          <h3
            id="comparatif-ajoute"
            className="text-[1.375rem] leading-tight font-bold tracking-tight lg:text-[2rem]"
          >
            {c.adds(plan.nom, base.nom, added)}
          </h3>
          <p className="text-sm text-white/80 lg:text-base">
            <span className="lg:hidden">{c.swipe}</span>
            <span className="hidden lg:inline">{c.addsLead}</span>
          </p>
        </div>
        <div className="hidden flex-col items-end gap-2.5 lg:flex">
          <p className="flex items-baseline gap-1.5">
            <b className="text-[2.75rem] font-bold tracking-tight">{price(plan.monthlyCents)}</b>
            <span className="text-white/80">{t.perMonth}</span>
          </p>
          {plan.ouverte && (
            <Link
              href={SIGN_UP}
              className={`inline-flex min-h-12 items-center gap-2.5 rounded-pill bg-white px-5 font-bold ${NAVY} transition-colors hover:bg-white/90`}
            >
              {c.tryPlan(plan.nom, TRIAL_MONTHS)}
              <ArrowRight aria-hidden="true" className="size-[1.125rem]" strokeWidth={2.4} />
            </Link>
          )}
        </div>
      </div>
      <ul className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pr-5 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-3 lg:gap-3.5 lg:overflow-visible lg:pr-0 lg:pb-0">
        {cards.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex w-[14.75rem] shrink-0 snap-start flex-col gap-2.5 rounded-card border border-white/15 bg-white/[0.08] p-4 lg:w-auto lg:flex-row lg:items-start lg:gap-3.5 lg:rounded-[1.125rem] lg:px-5.5 lg:py-5"
          >
            <span className="inline-flex size-[2.375rem] shrink-0 items-center justify-center rounded-xl bg-white text-primary lg:size-[2.625rem]">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <b className="font-bold lg:text-[1.0625rem]">{title}</b>
              <span className="text-[0.8125rem] text-white/80 lg:text-sm">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Valeur d'une cellule ; la formule recommandée en plein. */
function CellValue({
  cell,
  strong,
  compact,
}: {
  cell: PlanFeatureCell;
  strong: boolean;
  compact?: boolean;
}) {
  if (cell.kind === "inclus") {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full ${
          strong ? "size-6.5 bg-primary text-white" : "size-6 bg-primary-soft text-primary-strong"
        }`}
      >
        <Check
          aria-hidden="true"
          className={strong ? "size-[0.9375rem]" : "size-3.5"}
          strokeWidth={3}
        />
        <span className="sr-only">{c.included}</span>
      </span>
    );
  }
  if (cell.kind === "absent") {
    return (
      <span className="text-lg font-semibold text-[#c3c8d2]">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{c.notIncluded}</span>
      </span>
    );
  }
  return strong ? (
    <b className={`font-bold ${NAVY} ${compact ? "text-sm" : ""}`}>{cell.text}</b>
  ) : (
    <span className={`text-foreground ${compact ? "text-sm" : ""}`}>{cell.text}</span>
  );
}

function PlanButton({ plan, strong }: { plan: Plan; strong: boolean }) {
  if (!plan.ouverte) {
    return <span className="block text-center text-sm text-subtle-foreground">{t.soon}</span>;
  }
  return strong ? (
    <Link
      href={SIGN_UP}
      className="flex min-h-11.5 items-center justify-center gap-2 rounded-pill bg-primary px-3.5 font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      {c.tryShort(plan.nom)}
      <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.4} />
    </Link>
  ) : (
    <Link
      href={SIGN_UP}
      className="flex min-h-11.5 items-center justify-center rounded-pill border border-border-strong bg-surface px-3.5 font-semibold text-foreground transition-colors hover:bg-background"
    >
      {c.choose(plan.nom)}
    </Link>
  );
}

/**
 * Tableau pour ordinateur, colonne recommandée surlignée de haut en bas (ADR 0368) : toutes les
 * lignes, par rubrique (le mode « Ce qui change » et ses pastilles ont été retirés).
 */
function DesktopTable({
  plans,
  recIndex,
  groups,
  diffCount,
  commonCount,
}: {
  plans: Plan[];
  recIndex: number;
  groups: PlanComparison;
  diffCount: number;
  commonCount: number;
}) {
  // Colonne recommandée : fond bleuté et bordure continue, coins arrondis en haut et en bas.
  const col = (i: number, edge?: "top" | "bottom") =>
    i === recIndex
      ? `bg-primary-softer border-x-2 border-x-primary ${
          edge === "top"
            ? "border-t-2 border-t-primary rounded-t-[1.375rem]"
            : edge === "bottom"
              ? "border-b-2 border-b-primary rounded-b-[1.375rem]"
              : ""
        }`
      : "";
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface px-0 shadow-card">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[0.9375rem]">
        <caption className="sr-only">{c.caption}</caption>
        <colgroup>
          <col />
          {plans.map((plan, i) => (
            <col key={plan.code} className={i === recIndex ? "w-[17rem]" : "w-[14.5rem]"} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sticky top-16 z-10 rounded-tl-[1.5rem] bg-surface">
              <span className="sr-only">{c.feature}</span>
            </th>
            {plans.map((plan, i) => {
              const strong = i === recIndex;
              return (
                <th
                  key={plan.code}
                  scope="col"
                  className={`sticky top-16 z-10 px-5 pt-6 pb-2 text-center align-bottom font-normal ${
                    strong ? col(i, "top") : "bg-surface"
                  } ${i === plans.length - 1 ? "rounded-tr-[1.5rem]" : ""}`}
                >
                  {strong && (
                    <span className="mx-auto mb-2 block w-fit rounded-pill bg-primary px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.08em] text-primary-foreground uppercase">
                      {c.recommendedBadge}
                    </span>
                  )}
                  <span className="block text-[1.375rem] font-bold tracking-tight">{plan.nom}</span>
                  <span className="mt-1 flex items-baseline justify-center gap-1.5">
                    <b
                      className={`font-bold tracking-tight ${
                        strong ? `text-[2.375rem] ${NAVY}` : "text-[2rem] text-foreground"
                      }`}
                    >
                      {price(plan.monthlyCents)}
                    </b>
                    <span className="text-[0.8125rem] text-label">{t.perMonth}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-border px-7 pt-1 pb-6 align-top">
              <span className="block max-w-[22.5rem] text-sm text-label">
                {c.summary(diffCount, commonCount)}
              </span>
              <span className="mt-2.5 flex gap-4 text-[0.8125rem] text-label">
                <span className="inline-flex items-center gap-1.5">
                  <CellValue cell={{ kind: "inclus" }} strong={false} />
                  {c.included}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-lg font-semibold text-[#c3c8d2]">
                    —
                  </span>
                  {c.notIncluded}
                </span>
              </span>
            </td>
            {plans.map((plan, i) => (
              <td
                key={plan.code}
                className={`border-b border-b-border px-5 pb-6 text-center align-top ${col(i)}`}
              >
                <span className="block min-h-[1.2rem] text-[0.8125rem] text-label">
                  {plan.accroche}
                </span>
                <span className="mt-1 mb-3 block text-[0.8125rem] text-label">
                  {c.yearly(price(monthlyEquivalentCents(annualPriceCents(plan.monthlyCents))))}
                </span>
                <PlanButton plan={plan} strong={i === recIndex} />
              </td>
            ))}
          </tr>
        </tbody>
        {groups.map((group) => {
          const Icon = groupIcon(group.categorie);
          return (
            <tbody key={group.categorie}>
              <tr>
                <th
                  scope="colgroup"
                  className="border-b border-border px-7 pt-5.5 pb-3 text-left font-normal"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 items-center justify-center rounded-[0.625rem] bg-primary-softer text-primary-strong">
                      <Icon aria-hidden="true" className="size-[1.0625rem]" />
                    </span>
                    <b className="text-lg font-bold tracking-tight">{group.categorie}</b>
                  </span>
                </th>
                {plans.map((plan, i) => (
                  <td key={plan.code} className={`border-b border-b-border ${col(i)}`} />
                ))}
              </tr>
              {group.items.map((item) => (
                <tr key={item.libelle}>
                  <th
                    scope="row"
                    className="border-b border-[#f0f2f5] px-7 py-3 text-left align-middle font-normal"
                  >
                    <span className="block font-medium">{item.libelle}</span>
                    {item.detail && (
                      <span className="mt-0.5 block text-[0.8125rem] text-label">
                        {item.detail}
                      </span>
                    )}
                  </th>
                  {item.cells.map((cell, i) => (
                    <td
                      key={plans[i]?.code ?? i}
                      className={`border-b border-b-[#f0f2f5] p-3 text-center align-middle ${col(i)}`}
                    >
                      <CellValue cell={cell} strong={i === recIndex} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          );
        })}
        <tbody>
          <tr>
            <td className="px-7 py-6.5 text-sm text-label">{c.footer}</td>
            {plans.map((plan, i) => (
              <td key={plan.code} className={`p-5.5 ${col(i, "bottom")}`}>
                <PlanButton plan={plan} strong={i === recIndex} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Téléphone : onglets par formule (la recommandée d'office), ce qui change, puis le commun. */
function MobileList({
  plans,
  recIndex,
  groups,
  common,
}: {
  plans: Plan[];
  recIndex: number;
  groups: PlanComparison;
  common: { libelle: string; detail: string | null }[];
}) {
  const [selected, setSelected] = useState(Math.max(recIndex, 0));
  const [allGroups, setAllGroups] = useState(false);
  const [allCommon, setAllCommon] = useState(false);
  const plan = plans[selected];
  if (!plan) return null;
  const base = plans[0];
  const strong = selected === recIndex;
  const shown = allGroups ? groups : groups.slice(0, 3);

  const note = (cells: PlanFeatureCell[]): string | null => {
    const mine = cells[selected];
    if (!mine) return null;
    if (mine.kind === "absent") {
      const next = cells.findIndex((cell, i) => i > selected && cell.kind !== "absent");
      const other = plans[next];
      return other ? c.withPlan(other.nom) : null;
    }
    const ref = cells[0];
    if (selected === 0 || !base || !ref) return null;
    if (ref.kind === "absent") return c.notInPlan(base.nom);
    if (ref.kind === "texte" && (mine.kind !== "texte" || mine.text !== ref.text)) {
      return c.inPlan(base.nom, ref.text);
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-5.5 lg:hidden">
      <div className="sticky top-16 z-10 -mx-1 bg-background px-1 pt-1.5 pb-1">
        <div
          role="group"
          aria-label={c.planTabs}
          className="grid gap-1 rounded-card bg-[#ece9df] p-1"
          style={{
            gridTemplateColumns: plans.map((_, i) => (i === recIndex ? "1.15fr" : "1fr")).join(" "),
          }}
        >
          {plans.map((p, i) => (
            <button
              key={p.code}
              type="button"
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              className={`flex min-h-13 flex-col items-center justify-center rounded-xl px-1 py-2 transition-colors ${
                i === selected
                  ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgba(72,105,246,0.6)]"
                  : "text-label"
              }`}
            >
              <b className={`text-sm ${i === selected ? "" : "text-foreground"}`}>{p.nom}</b>
              <span className={`text-xs ${i === selected ? "opacity-85" : ""}`}>
                {price(p.monthlyCents)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-[1.25rem] bg-surface ${
          strong ? "border-2 border-primary" : "border border-border"
        }`}
      >
        <div className={`flex flex-col gap-0.5 px-4.5 py-4 ${strong ? "bg-primary-softer" : ""}`}>
          <b className="text-xl font-bold tracking-tight">
            {plan.nom} · {price(plan.monthlyCents)} {t.perMonth}
          </b>
          <span className="text-[0.8125rem] text-label">
            {[
              plan.accroche,
              c.yearly(price(monthlyEquivalentCents(annualPriceCents(plan.monthlyCents)))),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {shown.map((group) => {
          const Icon = groupIcon(group.categorie);
          return (
            <section
              key={group.categorie}
              aria-label={group.categorie}
              className="border-t border-border"
            >
              <h4 className="flex items-center gap-2 px-4.5 pt-3.5 pb-1.5">
                <span className="inline-flex size-7 items-center justify-center rounded-[0.5625rem] bg-primary-softer text-primary-strong">
                  <Icon aria-hidden="true" className="size-[0.9375rem]" />
                </span>
                <b className="text-[0.9375rem] font-bold">{group.categorie}</b>
              </h4>
              <ul>
                {group.items.map((item) => {
                  const cell = item.cells[selected] ?? { kind: "absent" as const };
                  const line = note(item.cells);
                  return (
                    <li
                      key={item.libelle}
                      className={`flex items-center justify-between gap-3 px-4.5 py-2.5 ${
                        cell.kind === "absent" ? "opacity-60" : ""
                      }`}
                    >
                      <span className="flex flex-col gap-px">
                        <span className="text-sm font-medium">{item.libelle}</span>
                        {line && <span className="text-xs text-subtle-foreground">{line}</span>}
                      </span>
                      <span className="shrink-0 text-right">
                        <CellValue cell={cell} strong={strong} compact />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {groups.length > 3 && (
          <div className="border-t border-border px-4.5 pt-3 pb-4">
            <button
              type="button"
              aria-expanded={allGroups}
              onClick={() => setAllGroups(!allGroups)}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-strong"
            >
              {allGroups ? c.less : c.moreGroups(groups.length - 3)}
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${allGroups ? "rotate-180" : ""}`}
                strokeWidth={2.2}
              />
            </button>
          </div>
        )}
        <div className="border-t border-border p-4.5 pt-3">
          <PlanButton plan={plan} strong={strong} />
        </div>
      </div>

      {common.length > 0 && (
        <section
          aria-label={c.commonTitle}
          className="flex flex-col gap-2.5 rounded-[1.25rem] border border-border bg-surface px-4.5 py-4"
        >
          <h4 className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-[1.125rem] text-success" />
            <b className="text-[0.9375rem] font-bold">{c.commonTitle}</b>
          </h4>
          {allCommon ? (
            <ul className="flex flex-wrap gap-1.5">
              {common.map((item) => (
                <li
                  key={item.libelle}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-border py-1 pr-2.5 pl-1.5 text-xs"
                >
                  <Check aria-hidden="true" className="size-3 text-success" strokeWidth={3} />
                  {item.libelle}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.8125rem] text-label">
              {c.commonLead(common.length)}{" "}
              {common
                .slice(0, 6)
                .map((item) => item.libelle.toLowerCase())
                .join(", ")}
              …
            </p>
          )}
          <button
            type="button"
            aria-expanded={allCommon}
            onClick={() => setAllCommon(!allCommon)}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-primary-strong"
          >
            {allCommon ? c.less : c.commonShowAll(common.length)}
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform ${allCommon ? "rotate-180" : ""}`}
              strokeWidth={2.2}
            />
          </button>
        </section>
      )}
    </div>
  );
}
