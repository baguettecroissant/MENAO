import { planComparison } from "@menao/core";
import type { PricingPlan } from "@/components/pro-landing/pricing-plans";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";
import { planAgentsLine } from "./plan-agents";

const avantagesOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * Formules et comparatif lus en base (tables plans et plan_features, F-15, ADR 0200), partagés par
 * /pro et /pro/formules (ADR 0265), avec la ligne des assistants IA de chaque formule.
 */
export async function loadPricing() {
  const [{ data: plans }, { data: features }] = await Promise.all([
    createPublicClient()
      .from("plans")
      .select(
        "code, nom, accroche, prix_mensuel_ht_centimes, avantages, ouverte, recommandee, limites",
      )
      .order("ordre"),
    createPublicClient().from("plan_features").select("categorie, libelle, detail, valeurs, ordre"),
  ]);
  const pricingPlans: PricingPlan[] = (plans ?? []).map((plan) => ({
    code: plan.code,
    nom: plan.nom,
    accroche: plan.accroche,
    monthlyCents: plan.prix_mensuel_ht_centimes,
    avantages: avantagesOf(plan.avantages),
    ouverte: plan.ouverte,
    recommandee: plan.recommandee,
    agents: planAgentsLine(plan.limites),
  }));
  const comparison = planComparison(
    features ?? [],
    pricingPlans.map((plan) => plan.code),
  );
  const base = plans?.find((p) => p.ouverte) ?? plans?.[0] ?? null;
  return { pricingPlans, comparison, baseCents: base?.prix_mensuel_ht_centimes ?? null };
}

/** Questions sur les objections (ADR 0265), reprises de la FAQ des artisans. */
type FaqItem = { q: string; a: string };

export function proObjections(): FaqItem[] {
  const groups: readonly { items: readonly FaqItem[] }[] = fr.pro.faqPage.groups;
  const all: FaqItem[] = [...fr.pro.landing.faq, ...groups.flatMap((group) => group.items)];
  const objections: readonly string[] = fr.pro.landing.objections;
  return objections
    .map((question) => all.find((item) => item.q === question))
    .filter((item): item is FaqItem => item !== undefined);
}
